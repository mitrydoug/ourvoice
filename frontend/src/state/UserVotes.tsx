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
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { encodeFunctionData, parseEventLogs } from "viem";
import { FORUM_ABI, useForum } from "./Forum";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";

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
  stagedStatements: StagedStatement[];
}

export interface StagedStatement {
  /** Client-side temporary ID (uuid or counter) — NOT an on-chain ID. */
  tempId: string;
  text: string;
  initialSupport: number;
}

export type CommitStatus =
  | "idle"
  | "awaiting-approval"
  | "pending-confirmation"
  | "confirmed"
  | "cancelled"
  | "stale-step"
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

type StageStatement = {
  type: "STAGE_STATEMENT";
  payload: { tempId: string; text: string; initialSupport: number };
};

type UnstageStatement = {
  type: "UNSTAGE_STATEMENT";
  payload: { tempId: string };
};

type CommitStaleStep = {
  type: "COMMIT_STALE_STEP";
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
  | ResetCommitStatus
  | StageStatement
  | UnstageStatement
  | CommitStaleStep;

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
          stagedStatements: [],
        };
        newState.commitStatus = "confirmed";
        newState.pendingTxHash = undefined;
        newState.confirmedBlockNumber = undefined;
      } else if (!newState.staged) {
        newState.staged = {
          credits: onChainState.credits,
          supportAdjustments: new Map(),
          stagedStatements: [],
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
        stagedStatements: [...state.staged.stagedStatements],
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
        stagedStatements: [],
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
        stagedStatements: [],
      };
      break;
    }
    case "RESET_COMMIT_STATUS": {
      newState.commitStatus = "idle";
      newState.pendingTxHash = undefined;
      newState.confirmedBlockNumber = undefined;
      break;
    }
    case "STAGE_STATEMENT": {
      if (!state.staged) {
        throw new Error(
          "Cannot stage statement before on-chain state is synced",
        );
      }
      newState.staged = {
        ...state.staged,
        supportAdjustments: new Map(state.staged.supportAdjustments),
        stagedStatements: [
          ...state.staged.stagedStatements,
          {
            tempId: action.payload.tempId,
            text: action.payload.text,
            initialSupport: action.payload.initialSupport,
          },
        ],
      };
      break;
    }
    case "UNSTAGE_STATEMENT": {
      if (!state.staged) break;
      newState.staged = {
        ...state.staged,
        supportAdjustments: new Map(state.staged.supportAdjustments),
        stagedStatements: state.staged.stagedStatements.filter(
          (s) => s.tempId !== action.payload.tempId,
        ),
      };
      break;
    }
    case "COMMIT_STALE_STEP": {
      newState.commitStatus = "stale-step";
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
    // Include cost for staged new statements
    for (const stmt of newState.staged.stagedStatements) {
      totalAdjustmentCost += adjustmentCost(0, stmt.initialSupport);
    }
  }

  const stagedCredits = (newState.onChain?.credits || 0) - totalAdjustmentCost;

  const hasStagedChanges =
    (newState.staged?.supportAdjustments.size ?? 0) > 0 ||
    (newState.staged?.stagedStatements.length ?? 0) > 0;

  newState = {
    ...newState,
    staged: newState.staged
      ? {
          ...newState.staged,
          credits: stagedCredits,
        }
      : undefined,
    hasStagedChanges,
    hasEnoughCredits: stagedCredits >= 0,
  };

  console.log("Updating state: ", newState);
  return newState;
};

type UserNotVerifiedContextValue = {
  isUserVerified: false;
  state: undefined;
  dispatch: undefined;
  commitChanges: undefined;
  resetCommitStatus: undefined;
  getEffectiveSupport: undefined;
  getOnChainSupport: undefined;
  hasAdjustment: undefined;
  stageStatement: undefined;
  unstageStatement: undefined;
};

type UserSupportContextValue = {
  isUserVerified: true;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitChanges: () => void | Promise<void>;
  resetCommitStatus: () => void;
  getEffectiveSupport: (statementId: number) => number;
  getOnChainSupport: (statementId: number) => number;
  hasAdjustment: (statementId: number) => boolean;
  stageStatement: (text: string, initialSupport?: number) => void;
  unstageStatement: (tempId: string) => void;
};

export const UserVoteContext = createContext<
  UserNotVerifiedContextValue | UserSupportContextValue | undefined
>(undefined);

export const UserVoteProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
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

  // Read stepDurationSeconds for requireStep guard
  const { data: stepDurationSeconds } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "stepDurationSeconds",
    query: { enabled: !!forumContractAddress },
  });

  // Track authored statements in localStorage for "My Statements"
  const { add: addAuthoredStatement } =
    useLocalStorageSet("authoredStatements");

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

  const {
    data: onChainUserStatementSupport,
    refetch: refetchSupport,
    error: supportError,
  } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: address,
    functionName: "getUserStatementSupport",
    args: [],
    query: {
      enabled: Boolean(address && isUserVerified),
    },
  });

  const {
    data: onChainUserBalance,
    refetch: refetchBalance,
    error: balanceError,
  } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: address,
    functionName: "getUserBalance",
    args: [],
    query: {
      enabled: Boolean(address && isUserVerified),
    },
  });

  const refetch = useCallback(() => {
    void refetchSupport();
    void refetchBalance();
  }, [refetchSupport, refetchBalance]);

  console.log("Support error: ", supportError);
  console.log("Balance error: ", balanceError);
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

  // When receipt arrives, extract authored statement IDs from logs and
  // dispatch COMMIT_CONFIRMED with the block number.
  useEffect(() => {
    if (
      txReceipt &&
      state.commitStatus === "pending-confirmation" &&
      state.confirmedBlockNumber === undefined
    ) {
      // Decode StatementAdded events to get the actual on-chain IDs
      const statementEvents = parseEventLogs({
        abi: FORUM_ABI,
        logs: txReceipt.logs,
        eventName: "StatementAdded",
      });
      for (const event of statementEvents) {
        addAuthoredStatement(Number(event.args.id));
      }

      dispatch({
        type: "COMMIT_CONFIRMED",
        payload: { blockNumber: txReceipt.blockNumber },
      });
    }
  }, [
    txReceipt,
    state.commitStatus,
    state.confirmedBlockNumber,
    addAuthoredStatement,
  ]);

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

  const commitChanges = useCallback(async () => {
    if (state.hasStagedChanges && state.hasEnoughCredits && state.staged) {
      console.log(
        "Committing changes: ",
        state.staged.supportAdjustments,
        state.staged.stagedStatements,
      );

      const hasSupportAdjustments = state.staged.supportAdjustments.size > 0;

      dispatch({ type: "BEGIN_COMMIT" });

      try {
        // Build the list of encoded calls for multicall
        const calls: `0x${string}`[] = [];

        // 1. requireStep guard — protects against decay drift
        if (stepDurationSeconds && stepDurationSeconds > 0n) {
          const currentStep =
            BigInt(Math.floor(Date.now() / 1000)) / stepDurationSeconds;
          calls.push(
            encodeFunctionData({
              abi: FORUM_ABI,
              functionName: "requireStep",
              args: [currentStep],
            }),
          );
        }

        // 2. addStatement calls for staged new statements
        for (const stmt of state.staged.stagedStatements) {
          calls.push(
            encodeFunctionData({
              abi: FORUM_ABI,
              functionName: "addStatement",
              args: [stmt.text, BigInt(stmt.initialSupport)],
            }),
          );
        }

        // 3. adjustSupport call for support adjustments on existing statements
        if (hasSupportAdjustments) {
          const supportAdjustments: { statementId: bigint; value: bigint }[] =
            [];
          for (const [statementId, adjustment] of state.staged
            .supportAdjustments) {
            supportAdjustments.push({
              statementId: BigInt(statementId),
              value: BigInt(adjustment),
            });
          }
          calls.push(
            encodeFunctionData({
              abi: FORUM_ABI,
              functionName: "adjustSupport",
              args: [supportAdjustments],
            }),
          );
        }

        // Use multicall to batch everything in a single transaction.
        // Authored statement IDs are extracted from the receipt logs in
        // the COMMIT_CONFIRMED effect, avoiding prediction race conditions.
        const txHash = await writeContractAsync({
          address: forumContractAddress,
          abi: FORUM_ABI,
          functionName: "multicall",
          args: [calls],
        });

        dispatch({ type: "COMMIT_SUBMITTED", payload: { txHash } });
      } catch (err: unknown) {
        // Check for StaleStep revert
        const errorStr = String(err);
        if (errorStr.includes("StaleStep")) {
          dispatch({ type: "COMMIT_STALE_STEP" });
        } else {
          // User rejected the transaction in their wallet, or other error
          dispatch({ type: "COMMIT_CANCELLED" });
        }
      }
    }
  }, [
    state,
    writeContractAsync,
    forumContractAddress,
    dispatch,
    stepDurationSeconds,
  ]);

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

  // Stage a new statement for batched submission
  const stageStatement = useCallback(
    (text: string, initialSupport = 0) => {
      const tempId = crypto.randomUUID();
      dispatch({
        type: "STAGE_STATEMENT",
        payload: { tempId, text, initialSupport },
      });
    },
    [dispatch],
  );

  // Remove a staged statement before it is committed
  const unstageStatement = useCallback(
    (tempId: string) => {
      dispatch({ type: "UNSTAGE_STATEMENT", payload: { tempId } });
    },
    [dispatch],
  );

  if (isUserVerified) {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: isUserVerified,
          state,
          dispatch,
          commitChanges,
          resetCommitStatus,
          getEffectiveSupport,
          getOnChainSupport,
          hasAdjustment,
          stageStatement,
          unstageStatement,
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
          commitChanges: undefined,
          resetCommitStatus: undefined,
          getEffectiveSupport: undefined,
          getOnChainSupport: undefined,
          hasAdjustment: undefined,
          stageStatement: undefined,
          unstageStatement: undefined,
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
