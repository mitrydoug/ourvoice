import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
} from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { FORUM_ABI, useForum } from "./Forum";
import useBlockSync from "@/hooks/useBlockSync";

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

export type CommitStatus =
  | "idle"
  | "awaiting-approval"
  | "pending-confirmation"
  | "confirmed"
  | "cancelled"
  | "error";

interface UserSupportState {
  onChain?: UserSupport;
  staged?: StagedSupport;
  hasStagedChanges: boolean;
  hasEnoughCredits: boolean;
  commitStatus: CommitStatus;
  pendingTxHash?: `0x${string}`;
  confirmedBlockNumber?: bigint;
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

type BeginCommit = {
  type: "BEGIN_COMMIT";
};

type CommitSubmitted = {
  type: "COMMIT_SUBMITTED";
  payload: { txHash: `0x${string}` };
};

type CommitConfirmed = {
  type: "COMMIT_CONFIRMED";
  payload: { blockNumber: bigint };
};

type CommitCancelled = {
  type: "COMMIT_CANCELLED";
};

type CommitError = {
  type: "COMMIT_ERROR";
};

type ResetCommitStatus = {
  type: "RESET_COMMIT_STATUS";
};

type UserSupportAction =
  | SyncOnChainState
  | StageUserSupport
  | ClearStagedSupport
  | BeginCommit
  | CommitSubmitted
  | CommitConfirmed
  | CommitCancelled
  | CommitError
  | ResetCommitStatus;

// Triangle number: triangle(x) = x*(x+1)/2
const triangle = (x: number): number => (x * (x + 1)) / 2;

// Cost of changing support from `fromSupport` to `toSupport` is
// triangle(|toSupport|) - triangle(|fromSupport|). A positive result means
// credits are spent; a negative result means credits are refunded.
const adjustmentCost = (fromSupport: number, toSupport: number): number => {
  return triangle(Math.abs(toSupport)) - triangle(Math.abs(fromSupport));
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

      // If we're waiting for a confirmed block to be synced, check if this
      // sync covers the block that confirmed our transaction.
      if (
        newState.commitStatus === "pending-confirmation" &&
        newState.confirmedBlockNumber !== undefined
      ) {
        // The on-chain state now reflects (at least) the confirmed block.
        // Clear staged support since the chain state includes our changes.
        newState.staged = {
          credits: onChainState.credits,
          supportAdjustments: new Map(),
        };
        newState.commitStatus = "confirmed";
        newState.pendingTxHash = undefined;
        newState.confirmedBlockNumber = undefined;
      } else if (!newState.staged) {
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
    case "BEGIN_COMMIT": {
      newState.commitStatus = "awaiting-approval";
      break;
    }
    case "COMMIT_SUBMITTED": {
      newState.commitStatus = "pending-confirmation";
      newState.pendingTxHash = action.payload.txHash;
      break;
    }
    case "COMMIT_CONFIRMED": {
      // Receipt arrived — store the block number. If SYNC_ONCHAIN_STATE
      // already covered this block we transition immediately; otherwise we
      // wait for the next sync to pick it up (handled in SYNC_ONCHAIN_STATE).
      newState.confirmedBlockNumber = action.payload.blockNumber;
      break;
    }
    case "COMMIT_CANCELLED": {
      newState.commitStatus = "cancelled";
      newState.pendingTxHash = undefined;
      break;
    }
    case "COMMIT_ERROR": {
      newState.commitStatus = "error";
      newState.pendingTxHash = undefined;
      newState.confirmedBlockNumber = undefined;
      // Clear staged support so user re-syncs cleanly from chain
      newState.staged = {
        credits: newState.onChain ? newState.onChain.credits : 0,
        supportAdjustments: new Map(),
      };
      break;
    }
    case "RESET_COMMIT_STATUS": {
      newState.commitStatus = "idle";
      newState.pendingTxHash = undefined;
      newState.confirmedBlockNumber = undefined;
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
  resetCommitStatus: undefined;
  getEffectiveSupport: undefined;
  getOnChainSupport: undefined;
  hasAdjustment: undefined;
};

type UserSupportContextValue = {
  isUserVerified: true;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitSupport: () => void;
  resetCommitStatus: () => void;
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
    commitStatus: "idle",
  });
  const { writeContractAsync } = useWriteContract();
  const { address } = useAccount();
  const { forumContractAddress } = useForum();
  console.log("UserVoteProvider for address: ", address);
  console.log("Forum contract address: ", forumContractAddress);

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

  console.log("Raw useReadContracts data: ", data);
  console.log(
    "Fetched user support from contract: ",
    onChainUserStatementSupport,
  );
  console.log("Fetched user balance from contract: ", onChainUserBalance);

  useEffect(() => {
    // Load state from blockchain
    if (
      onChainUserStatementSupport !== undefined &&
      onChainUserBalance !== undefined
    ) {
      console.log("Dispatching SYNC_ONCHAIN_STATE");
      dispatch({
        type: "SYNC_ONCHAIN_STATE",
        payload: {
          credits: onChainUserBalance,
          statementSupport: [...onChainUserStatementSupport],
        },
      });
    }
  }, [onChainUserStatementSupport, onChainUserBalance]);

  // Sync with blockchain on every new block
  useBlockSync(refetch);

  // Wait for transaction receipt once a tx hash is available
  const { data: txReceipt } = useWaitForTransactionReceipt({
    hash: state.pendingTxHash,
    confirmations: 1,
    query: {
      enabled: !!state.pendingTxHash,
    },
  });

  // When receipt arrives, dispatch COMMIT_CONFIRMED with the block number
  useEffect(() => {
    if (
      txReceipt &&
      state.commitStatus === "pending-confirmation" &&
      state.confirmedBlockNumber === undefined
    ) {
      dispatch({
        type: "COMMIT_CONFIRMED",
        payload: { blockNumber: txReceipt.blockNumber },
      });
    }
  }, [txReceipt, state.commitStatus, state.confirmedBlockNumber]);

  // Timeout: if commit is in-flight for more than 30 seconds, treat as error
  const commitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (
      state.commitStatus !== "idle" &&
      state.commitStatus !== "confirmed" &&
      state.commitStatus !== "cancelled" &&
      state.commitStatus !== "error"
    ) {
      commitTimeoutRef.current = setTimeout(() => {
        dispatch({ type: "COMMIT_ERROR" });
      }, 30_000);
    } else {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
    }
    return () => {
      if (commitTimeoutRef.current) {
        clearTimeout(commitTimeoutRef.current);
        commitTimeoutRef.current = null;
      }
    };
  }, [state.commitStatus]);

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

      dispatch({ type: "BEGIN_COMMIT" });

      try {
        const txHash = await writeContractAsync({
          address: forumContractAddress,
          abi: FORUM_ABI,
          functionName: "adjustSupport",
          args: [supportAdjustments],
        });

        dispatch({ type: "COMMIT_SUBMITTED", payload: { txHash } });
      } catch {
        // User rejected the transaction in their wallet, or other error
        dispatch({ type: "COMMIT_CANCELLED" });
      }
    }
  }, [state, writeContractAsync, forumContractAddress, dispatch]);

  const resetCommitStatus = useCallback(() => {
    dispatch({ type: "RESET_COMMIT_STATUS" });
  }, [dispatch]);

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
          resetCommitStatus,
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
          resetCommitStatus: undefined,
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
