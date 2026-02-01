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

interface UserSupport {
  credits: number;
  statementSupport: Map<number, number>;
}

interface StagedSupport {
  credits: number;
  supportAdjustments: Map<number, number>;
}

interface UserSupportState {
  onChain?: UserSupport;
  staged?: StagedSupport;
  hasStagedChanges: boolean;
  hasEnoughCredits: boolean;
}

type SyncOnChainState = {
  type: "SYNC_ONCHAIN_STATE";
  payload: { credits: bigint; statementSupport: StatementSupport[] };
};

type StageUserSupport = {
  type: "STAGE_USER_SUPPORT";
  payload: { statementId: bigint; adjustment: number };
};

type ClearStagedSupport = {
  type: "CLEAR_STAGED_SUPPORT";
};

type UserSupportAction =
  | SyncOnChainState
  | StageUserSupport
  | ClearStagedSupport;

// Helper to calculate the cost of an adjustment from one support level to another
const adjustmentCost = (fromSupport: number, toSupport: number): number => {
  const [start, end] =
    fromSupport < toSupport
      ? [fromSupport + 1, toSupport]
      : [toSupport + 1, fromSupport];
  if (start > end) return 0;
  return ((start + end) * (end - start + 1)) / 2;
};

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
        newState.staged = {
          credits: onChainState.credits,
          supportAdjustments: new Map(),
        };
      }
      break;
    }
    case "STAGE_USER_SUPPORT": {
      const { statementId, adjustment } = action.payload;
      if (!state.staged || !newState.staged) {
        throw new Error(
          "Cannot stage support adjustment before on-chain state is synced",
        );
      }
      newState.staged = {
        ...state.staged,
        supportAdjustments: new Map(state.staged.supportAdjustments),
      };
      if (adjustment === 0) {
        newState.staged.supportAdjustments.delete(Number(statementId));
      } else {
        newState.staged.supportAdjustments.set(Number(statementId), adjustment);
      }
      break;
    }
    case "CLEAR_STAGED_SUPPORT": {
      newState.staged = {
        credits: newState.onChain ? newState.onChain.credits : 0,
        supportAdjustments: new Map(),
      };
      break;
    }
  }

  // Calculate total adjustment cost
  let totalAdjustmentCost = 0;
  if (newState.staged && newState.onChain) {
    for (const [statementId, adjustment] of newState.staged
      .supportAdjustments) {
      const onChainSupport =
        newState.onChain.statementSupport.get(statementId) || 0;
      const newSupport = onChainSupport + adjustment;
      totalAdjustmentCost += adjustmentCost(onChainSupport, newSupport);
    }
  }

  const stagedCredits = (newState.onChain?.credits || 0) - totalAdjustmentCost;

  newState = {
    ...newState,
    staged: newState.staged
      ? {
          ...newState.staged,
          credits: stagedCredits,
        }
      : undefined,
    hasStagedChanges: newState.staged?.supportAdjustments.size
      ? newState.staged.supportAdjustments.size > 0
      : false,
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
  getEffectiveSupport: undefined;
  getOnChainSupport: undefined;
  hasAdjustment: undefined;
};

type UserSupportContextValue = {
  isUserVerified: true;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitSupport: () => void;
  getEffectiveSupport: (statementId: number) => number;
  getOnChainSupport: (statementId: number) => number;
  hasAdjustment: (statementId: number) => boolean;
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
    if (state.hasStagedChanges && state.hasEnoughCredits && state.staged) {
      console.log(
        "Committing support changes: ",
        state.staged.supportAdjustments,
      );

      const supportAdjustments: { statementId: bigint; value: bigint }[] = [];
      for (const [statementId, adjustment] of state.staged.supportAdjustments) {
        supportAdjustments.push({
          statementId: BigInt(statementId),
          value: BigInt(adjustment),
        });
      }

      writeContract({
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "adjustSupport",
        args: [supportAdjustments],
      });
    }
  }, [state, writeContract, forumContractAddress]);

  // Helper function to get effective support (on-chain + adjustment)
  const getEffectiveSupport = useCallback(
    (statementId: number): number => {
      const onChainSupport =
        state.onChain?.statementSupport.get(statementId) || 0;
      const adjustment = state.staged?.supportAdjustments.get(statementId) || 0;
      return onChainSupport + adjustment;
    },
    [state.onChain, state.staged],
  );

  // Helper function to get on-chain support (without adjustments)
  const getOnChainSupport = useCallback(
    (statementId: number): number => {
      return state.onChain?.statementSupport.get(statementId) || 0;
    },
    [state.onChain],
  );

  // Helper function to check if a statement has a pending adjustment
  const hasAdjustment = useCallback(
    (statementId: number): boolean => {
      return state.staged?.supportAdjustments.has(statementId) || false;
    },
    [state.staged],
  );

  if (isUserVerified) {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: isUserVerified,
          state,
          dispatch,
          commitSupport,
          getEffectiveSupport,
          getOnChainSupport,
          hasAdjustment,
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
          getEffectiveSupport: undefined,
          getOnChainSupport: undefined,
          hasAdjustment: undefined,
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
