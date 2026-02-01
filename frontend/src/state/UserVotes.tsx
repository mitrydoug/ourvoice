import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import {
  useAccount,
  useBlockNumber,
  useReadContract,
  useReadContracts,
  useWriteContract,
} from "wagmi";
import { FORUM_ABI, useForum } from "./Forum";

interface StatementSupport {
  statementId: bigint;
  support: bigint;
}

interface SupportAdjustment {
  statementId: bigint;
  value: bigint;
}

interface UserSupport {
  credits: number;
  statementSupport: Map<number, number>;
}

interface UserSupportState {
  onChain?: UserSupport;
  staged?: UserSupport;
  hasStagedChanges: boolean;
  hasEnoughCredits: boolean;
}

type SyncOnChainState = {
  type: "SYNC_ONCHAIN_STATE";
  payload: { credits: bigint; statementSupport: StatementSupport[] };
};

type StageUserSupport = {
  type: "STAGE_USER_SUPPORT";
  payload: { statementId: bigint; newSupport: bigint };
};

type ClearStagedSupport = {
  type: "CLEAR_STAGED_SUPPORT";
};

type UserSupportAction =
  | SyncOnChainState
  | StageUserSupport
  | ClearStagedSupport;

// Actions:
// - SYNC_COMMITTED_SUPPORT
// - UPDATE_SUPPORT_ADJUSTMENT

const reducer = (
  state: UserSupportState,
  action: UserSupportAction,
): UserSupportState => {
  let newState = { ...state };

  switch (action.type) {
    case "SYNC_ONCHAIN_STATE": {
      const _supportMap = new Map<number, number>();
      action.payload.statementSupport.forEach((s) => {
        _supportMap.set(Number(s.statementId), Number(s.support));
      });
      const onChainState = {
        credits: Number(action.payload.credits),
        statementSupport: _supportMap,
      };
      newState.onChain = onChainState;
      if (!newState.staged) {
        newState.staged = onChainState;
      }
      break;
    }
    case "STAGE_USER_SUPPORT": {
      const { statementId, newSupport } = action.payload;
      if (!state.staged || !newState.staged) {
        throw new Error(
          "Cannot stage support adjustment before on-chain state is synced",
        );
      }
      newState.staged.statementSupport = new Map(state.staged.statementSupport);
      if (newSupport === BigInt(0)) {
        newState.staged.statementSupport.delete(Number(statementId));
      } else {
        newState.staged.statementSupport.set(
          Number(statementId),
          Number(newSupport),
        );
      }
      break;
    }
    case "CLEAR_STAGED_SUPPORT": {
      newState.staged = {
        credits: newState.onChain ? newState.onChain.credits : 0,
        statementSupport: new Map(
          state.onChain ? state.onChain.statementSupport : [],
        ),
      };
      break;
    }
  }

  let adjustmentCost = 0;
  const supportedStatementIds = new Set(
    newState.onChain?.statementSupport.keys(),
  ).union(new Set(newState.staged.statementSupport.keys()));

  for (const statementId of supportedStatementIds) {
    const onChainSupport =
      newState.onChain?.statementSupport.get(statementId) || 0;
    const stagedSupport =
      newState.staged.statementSupport.get(statementId) || 0;
    const [start, end] =
      onChainSupport < stagedSupport
        ? [onChainSupport + 1, stagedSupport]
        : [stagedSupport + 1, onChainSupport];
    adjustmentCost += ((start + end) * (end - start + 1)) / 2;
  }

  const stagedCredits = (newState.onChain?.credits || 0) - adjustmentCost;

  newState = {
    ...newState,
    staged: {
      ...newState.staged,
      credits: stagedCredits,
    },
    hasStagedChanges: adjustmentCost > 0,
    hasEnoughCredits: stagedCredits >= 0,
  };

  console.log("Updating state: ", newState);
  return newState;
};

type UserNotVerifiedContextValue = {
  isUserVerified: false;
  state: undefined;
  dispatch: undefined;
  commitSupport: undefined;
};

type UserSupportContextValue = {
  isUserVerified: true;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitSupport: () => void;
};

export const UserVoteContext = createContext<
  UserNotVerifiedContextValue | UserSupportContextValue | undefined
>(undefined);

export const UserVoteProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, {
    onChain: undefined,
    staged: undefined,
    hasStagedChanges: false,
    hasEnoughCredits: true,
  });
  const { writeContract } = useWriteContract();
  const { address } = useAccount();
  const { forumContractAddress } = useForum();
  console.log("UserVoteProvider for address: ", address);

  const { data: isUserVerified } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: address,
    functionName: "isMember",
    args: [],
    query: {
      enabled: !!address,
    },
  });

  console.log("User verified status: ", isUserVerified);

  const { data, refetch } = useReadContracts({
    allowFailure: false,
    account: address,
    contracts: [
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "getUserStatementSupport",
        args: [],
      },
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "getUserBalance",
        args: [],
      },
    ],
    query: {
      enabled: Boolean(address && isUserVerified),
    },
  });

  const [onChainUserStatementSupport, onChainUserBalance] = data || [];

  console.log(
    "Fetched user support from contract: ",
    onChainUserStatementSupport,
  );

  useEffect(() => {
    // Load state from blockchain
    if (onChainUserStatementSupport && onChainUserBalance) {
      dispatch({
        type: "SYNC_ONCHAIN_STATE",
        payload: {
          credits: onChainUserBalance,
          statementSupport: [...onChainUserStatementSupport],
        },
      });
    }
  }, [onChainUserStatementSupport, onChainUserBalance]);

  const { data: blockNumber } = useBlockNumber({
    watch: true,
  });

  useEffect(() => {
    refetch();
  }, [blockNumber, refetch]);

  const commitSupport = useCallback(async () => {
    if (state.hasStagedChanges && state.hasEnoughCredits) {
      console.log(
        "Committing support changes: ",
        state.staged?.statementSupport,
      );

      const supportAdjustments: SupportAdjustment[] = [];
      const supportedStatementIds = new Set(
        state.onChain?.statementSupport.keys(),
      ).union(new Set(state.staged?.statementSupport.keys()));

      for (const statementId of supportedStatementIds) {
        const onChainSupport =
          state.onChain?.statementSupport.get(statementId) || 0;
        const stagedSupport =
          state.staged?.statementSupport.get(statementId) || 0;
        const adjustment = stagedSupport - onChainSupport;
        if (adjustment !== 0) {
          supportAdjustments.push({
            statementId: BigInt(statementId),
            value: BigInt(adjustment),
          });
        }
      }

      writeContract({
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "adjustSupport",
        args: [supportAdjustments],
      });
    }
  }, [state, writeContract, forumContractAddress]);

  if (isUserVerified) {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: isUserVerified,
          state,
          dispatch,
          commitSupport,
        }}
      >
        {children}
      </UserVoteContext.Provider>
    );
  } else {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: !!isUserVerified,
          state: undefined,
          dispatch: undefined,
          commitSupport: undefined,
        }}
      >
        {children}
      </UserVoteContext.Provider>
    );
  }
};

export const useUserVotes = () => {
  const state = useContext(UserVoteContext);
  if (!state) {
    throw new Error(
      "useUserVoteContext must be used within a UserVoteProvider",
    );
  }
  return state;
};
