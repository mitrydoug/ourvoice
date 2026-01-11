import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { useAccount, useReadContract, useReadContracts, useWriteContract } from "wagmi";
import { FORUM_ABI, useForum } from "./Forum";
import { stat } from "fs";

interface OnChainUserState {
  credits: number;
  statementSupport: Map<number, number>;
}

interface UserSupportState {
  onChain?: OnChainUserState;
  statementSupportAdjustments: Map<number, number>;
  remainingCredits: number;
  hasUncommittedChanges: boolean;
  hasEnoughCredits: boolean;
}

type SyncOnChainState = {
  type: "SYNC_ONCHAIN_STATE";
  payload: Pick<UserSupportState, "onChain">;
};

type UpdateSupportAdjustment = {
  type: "UPDATE_SUPPORT_ADJUSTMENT";
  payload: { statementId: bigint; newSupportAdjustmentValue: bigint };
};

type ClearSupportAdjustments = {
  type: "CLEAR_SUPPORT_ADJUSTMENTS";
};

type UserSupportAction = SyncOnChainState | UpdateSupportAdjustment | ClearSupportAdjustments;

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
      newState.onChain = action.payload.onChain;
      break;
    }
    case "UPDATE_SUPPORT_ADJUSTMENT": {
      const { statementId, newSupportAdjustmentValue } = action.payload;
      newState.statementSupportAdjustments = new Map(state.statementSupportAdjustments);
      if (newSupportAdjustmentValue === BigInt(0)) {
        newState.statementSupportAdjustments.delete(Number(statementId));
      } else {
        newState.statementSupportAdjustments.set(Number(statementId), Number(newSupportAdjustmentValue));
      }
      break;
    }
    case "CLEAR_SUPPORT_ADJUSTMENTS": {
      newState.statementSupportAdjustments = new Map();
      break;
    }
  }

  let adjustmentCost = 0;
  const supportedStatementIds = new Set(newState.onChain?.statementSupport.keys()).union(new Set(newState.statementSupportAdjustments?.keys()));

  for (const statementId of supportedStatementIds) {
    const committedSupport = newState.onChain?.statementSupport.get(statementId) || 0;
    const adjustment = newState.statementSupportAdjustments?.get(statementId) || 0;
    const adjusted = committedSupport + adjustment;
    const [start, end] = committedSupport < adjusted ? [committedSupport + 1, adjusted] : [adjusted + 1, committedSupport];
    adjustmentCost += (start + end) * (end - start + 1) / 2;
  }

  newState = {
    ...newState,
    remainingCredits: newState.onChain.credits - adjustmentCost,
    hasUncommittedChanges: newState.statementSupportAdjustments.size > 0,
    hasEnoughCredits: newState.remainingCredits >= 0,
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
  const [state, dispatch] = useReducer(reducer, { onChain: undefined, statementSupportAdjustments: new Map(), remainingCredits: 0, hasUncommittedChanges: false, hasEnoughCredits: true });
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

  const [
    { data: onChainUserStatementSupport },
    { data: onChainUserBalance },
  ] = useReadContracts({
    allowFailure: false,
    contracts: [
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        account: address,
        functionName: "getUserStatementSupport",
        args: [],
        query: {
          enabled: Boolean(address && isUserVerified),
        },
      },
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        account: address,
        functionName: "getUserBalance",
        args: [],
        query: {
          enabled: Boolean(address && isUserVerified),
        },
      },
    ],
  });

  console.log("Fetched user support from contract: ", onChainUserStatementSupport);

  useEffect(() => {
    // Load state from blockchain
    if (onChainUserStatementSupport && onChainUserBalance) {
      const _supportMap = new Map<number, number>();
      onChainUserStatementSupport.forEach((s) => {
        _supportMap.set(Number(s.statementId), Number(s.support));
      });
      dispatch({
        type: "SYNC_ONCHAIN_STATE",
        payload: { onChain: { credits: onChainUserBalance, statementSupport: _supportMap } },
      });
    }
  }, [onChainUserStatementSupport, onChainUserBalance]);

  const commitSupport = useCallback(async () => {
    if (state.hasUncommittedChanges && state.hasEnoughCredits) {
      console.log("Committing support changes: ", state.statementSupportAdjustments);

      // Calculate adjustments (difference from committed state)
      const supportAdjustments = state.statementSupportAdjustments.forEach(
        (value, statementId) => ({ statementId: BigInt(statementId), value: BigInt(value) }));

      writeContract({
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "adjustSupport",
        args: [supportAdjustments],
      });
    }
  }, [
    state,
    writeContract,
    forumContractAddress,
  ]);

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
