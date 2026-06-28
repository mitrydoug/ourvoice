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
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { encodeFunctionData, parseEventLogs, BaseError } from "viem";
import { FORUM_ABI, useForum } from "./Forum";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import {
  type ContractWriteRequest,
  type SponsoredNetworkFeeEstimate,
  useParticipantAddress,
  useSponsoredContractWrite,
} from "@/hooks/useSponsoredContractWrite";

interface StatementSupport {
  statementId: bigint;
  support: bigint;
}

interface UserSupport {
  credits: number;
  statementSupport: Map<number, number>;
}

export enum SupportAdjustmentType {
  Delta = 0,
  SetTo = 1,
}

interface StagedSupportAdjustment {
  value: number;
  adjustmentType: SupportAdjustmentType;
}

interface StagedSupport {
  credits: number;
  supportAdjustments: Map<number, StagedSupportAdjustment>;
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
  | "error";

interface UserSupportState {
  onChain?: UserSupport;
  /** Snapshot of onChain at freeze time. While set, getEffectiveSupport
   *  reads from this instead of onChain so the UI stays consistent until
   *  we confirm the chain has synced past the committed block. */
  frozenOnChain?: UserSupport;
  staged?: StagedSupport;
  hasStagedChanges: boolean;
  hasEnoughCredits: boolean;
  commitStatus: CommitStatus;
  pendingTxHash?: `0x${string}`;
  confirmedBlockNumber?: bigint;
  /** Block number of the most recent SYNC_ONCHAIN_STATE update. */
  latestSyncBlockNumber?: bigint;
  /** Credit cost of the in-progress draft statement (before it is staged). */
  pendingDraftCost: number;
}

export type CommitPreview = {
  statementCount: number;
  supportAdjustmentCount: number;
  networkFee: SponsoredNetworkFeeEstimate;
};

type CommitChangesOptions = {
  showWalletUIs?: boolean;
};

type SyncOnChainState = {
  type: "SYNC_ONCHAIN_STATE";
  payload: {
    credits: bigint;
    statementSupport: StatementSupport[];
    blockNumber?: bigint;
  };
};

type StageUserSupport = {
  type: "STAGE_USER_SUPPORT";
  payload: { statementId: bigint; adjustment: StagedSupportAdjustment };
};

type SwitchUserSupport = {
  type: "SWITCH_USER_SUPPORT";
  payload: { sourceStatementId: number; targetStatementId: number };
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

type UpdateStagedInitialSupport = {
  type: "UPDATE_STAGED_INITIAL_SUPPORT";
  payload: { tempId: string; newSupport: number };
};

type SetPendingDraftCost = {
  type: "SET_PENDING_DRAFT_COST";
  payload: { cost: number };
};

type RestoreStaged = {
  type: "RESTORE_STAGED";
  payload: {
    supportAdjustments: Map<number, StagedSupportAdjustment>;
    stagedStatements: StagedStatement[];
  };
};

type UserSupportAction =
  | SyncOnChainState
  | StageUserSupport
  | SwitchUserSupport
  | ClearStagedSupport
  | BeginCommit
  | CommitSubmitted
  | CommitConfirmed
  | CommitCancelled
  | CommitError
  | ResetCommitStatus
  | StageStatement
  | UnstageStatement
  | UpdateStagedInitialSupport
  | SetPendingDraftCost
  | RestoreStaged;

// Quadratic cost for a given support level (in credit parts).
// Matches the on-chain formula: s*(s+M)/(2*M) where M = creditMultiplier.
const triangle = (x: number, creditMultiplier: number): number =>
  (Math.abs(x) * (Math.abs(x) + creditMultiplier)) / (2 * creditMultiplier);

const inverseTriangle = (
  creditCost: number,
  creditMultiplier: number,
): number => {
  if (creditCost <= 0) return 0;
  return Math.floor(
    (Math.sqrt(
      creditMultiplier * creditMultiplier + 8 * creditMultiplier * creditCost,
    ) -
      creditMultiplier) /
      2,
  );
};

// Cost of changing support from `fromSupport` to `toSupport` (both in
// credit parts). A positive result means credits are spent; a negative
// result means credits are refunded.
const adjustmentCost = (
  fromSupport: number,
  toSupport: number,
  creditMultiplier: number,
): number => {
  return (
    triangle(toSupport, creditMultiplier) -
    triangle(fromSupport, creditMultiplier)
  );
};

const getAdjustedSupport = (
  onChainSupport: number,
  adjustment: StagedSupportAdjustment,
): number => {
  return adjustment.adjustmentType === SupportAdjustmentType.SetTo
    ? adjustment.value
    : onChainSupport + adjustment.value;
};

const setStagedSupportAdjustment = (
  supportAdjustments: Map<number, StagedSupportAdjustment>,
  statementId: number,
  onChainSupport: number,
  adjustment: StagedSupportAdjustment,
): void => {
  if (getAdjustedSupport(onChainSupport, adjustment) === onChainSupport) {
    supportAdjustments.delete(statementId);
  } else {
    supportAdjustments.set(statementId, adjustment);
  }
};

// ── localStorage helpers for staged-support persistence ──────────────────────

type PersistedSupportAdjustment = number | StagedSupportAdjustment;

interface PersistedStaged {
  supportAdjustments: [number, PersistedSupportAdjustment][];
  stagedStatements: StagedStatement[];
}

const normalizeSupportAdjustment = (
  adjustment: PersistedSupportAdjustment,
): StagedSupportAdjustment => {
  if (typeof adjustment === "number") {
    return {
      value: adjustment,
      adjustmentType: SupportAdjustmentType.Delta,
    };
  }

  return {
    value: Number(adjustment.value),
    adjustmentType:
      adjustment.adjustmentType === SupportAdjustmentType.SetTo
        ? SupportAdjustmentType.SetTo
        : SupportAdjustmentType.Delta,
  };
};

const stagedStorageKey = (
  chainFingerprint: string,
  forumName: string,
  addrKey: string,
): string => `symvolia:staged:${chainFingerprint}:${forumName}:${addrKey}`;

const saveStagedToStorage = (key: string, staged: StagedSupport): void => {
  try {
    const data: PersistedStaged = {
      supportAdjustments: [...staged.supportAdjustments.entries()],
      stagedStatements: staged.stagedStatements,
    };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // quota exceeded or localStorage unavailable
  }
};

const loadStagedFromStorage = (
  key: string,
): {
  supportAdjustments: Map<number, StagedSupportAdjustment>;
  stagedStatements: StagedStatement[];
} | null => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedStaged;
    return {
      supportAdjustments: new Map(
        data.supportAdjustments.map(([statementId, adjustment]) => [
          statementId,
          normalizeSupportAdjustment(adjustment),
        ]),
      ),
      stagedStatements: data.stagedStatements ?? [],
    };
  } catch {
    return null;
  }
};

const clearStagedStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/**
 * If both conditions are met — (a) we have a confirmed tx block number,
 * and (b) the latest sync block is at or past that block — atomically
 * clear the freeze, clear staged support, and transition to "confirmed".
 */
const tryUnfreeze = (s: UserSupportState): void => {
  if (
    s.frozenOnChain &&
    s.confirmedBlockNumber !== undefined &&
    s.latestSyncBlockNumber !== undefined &&
    s.latestSyncBlockNumber >= s.confirmedBlockNumber &&
    s.onChain
  ) {
    s.frozenOnChain = undefined;
    s.staged = {
      credits: s.onChain.credits,
      supportAdjustments: new Map(),
      stagedStatements: [],
    };
    s.commitStatus = "confirmed";
    s.confirmedBlockNumber = undefined;
  }
};

const reducer = (
  state: UserSupportState,
  action: UserSupportAction & { creditMultiplier: number },
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
      // Always update onChain (even while frozen — rendering reads
      // from frozenOnChain instead, so this is invisible until unfreeze).
      newState.onChain = onChainState;

      if (action.payload.blockNumber !== undefined) {
        newState.latestSyncBlockNumber = action.payload.blockNumber;
      }

      if (!newState.staged) {
        newState.staged = {
          credits: onChainState.credits,
          supportAdjustments: new Map(),
          stagedStatements: [],
        };
      }

      tryUnfreeze(newState);
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
      const statementIdNumber = Number(statementId);
      const onChainSupport =
        newState.onChain?.statementSupport.get(statementIdNumber) || 0;
      setStagedSupportAdjustment(
        newState.staged.supportAdjustments,
        statementIdNumber,
        onChainSupport,
        adjustment,
      );
      break;
    }
    case "SWITCH_USER_SUPPORT": {
      const { sourceStatementId, targetStatementId } = action.payload;
      if (sourceStatementId === targetStatementId) break;
      if (!state.staged || !newState.staged || !newState.onChain) {
        throw new Error(
          "Cannot switch support before on-chain state is synced",
        );
      }
      const baseSupportState = newState.frozenOnChain ?? newState.onChain;

      newState.staged = {
        ...state.staged,
        supportAdjustments: new Map(state.staged.supportAdjustments),
        stagedStatements: [...state.staged.stagedStatements],
      };

      const sourceOnChainSupport =
        baseSupportState.statementSupport.get(sourceStatementId) || 0;
      const sourceAdjustment =
        newState.staged.supportAdjustments.get(sourceStatementId);
      const sourceSupport = sourceAdjustment
        ? getAdjustedSupport(sourceOnChainSupport, sourceAdjustment)
        : sourceOnChainSupport;

      if (sourceSupport === 0) break;

      const targetOnChainSupport =
        baseSupportState.statementSupport.get(targetStatementId) || 0;
      const targetAdjustment =
        newState.staged.supportAdjustments.get(targetStatementId);
      const targetSupport = targetAdjustment
        ? getAdjustedSupport(targetOnChainSupport, targetAdjustment)
        : targetOnChainSupport;

      if (
        targetSupport !== 0 &&
        Math.sign(targetSupport) !== Math.sign(sourceSupport)
      ) {
        break;
      }

      const mergedCreditCost =
        triangle(sourceSupport, action.creditMultiplier) +
        triangle(targetSupport, action.creditMultiplier);
      const mergedSupport =
        Math.sign(sourceSupport) *
        inverseTriangle(mergedCreditCost, action.creditMultiplier);

      setStagedSupportAdjustment(
        newState.staged.supportAdjustments,
        sourceStatementId,
        sourceOnChainSupport,
        {
          value: 0,
          adjustmentType: SupportAdjustmentType.SetTo,
        },
      );
      setStagedSupportAdjustment(
        newState.staged.supportAdjustments,
        targetStatementId,
        targetOnChainSupport,
        {
          value: mergedSupport - targetOnChainSupport,
          adjustmentType: SupportAdjustmentType.Delta,
        },
      );
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
      // Freeze: snapshot current on-chain state so rendering stays
      // consistent while we wait for the tx to be included and synced.
      newState.frozenOnChain = newState.onChain;
      break;
    }
    case "COMMIT_CONFIRMED": {
      // Store the confirmed block number. If latestSyncBlockNumber already
      // covers this block, tryUnfreeze will atomically clear the freeze,
      // clear staged, and set commitStatus to "confirmed".
      // Otherwise we stay in "pending-confirmation" until the next
      // SYNC_ONCHAIN_STATE brings us past this block.
      newState.confirmedBlockNumber = action.payload.blockNumber;
      newState.pendingTxHash = undefined;
      tryUnfreeze(newState);
      break;
    }
    case "COMMIT_CANCELLED": {
      newState.commitStatus = "cancelled";
      newState.pendingTxHash = undefined;
      newState.frozenOnChain = undefined;
      break;
    }
    case "COMMIT_ERROR": {
      newState.commitStatus = "error";
      newState.pendingTxHash = undefined;
      newState.confirmedBlockNumber = undefined;
      newState.frozenOnChain = undefined;
      // Clear staged support so user re-syncs cleanly from chain
      newState.staged = {
        credits: newState.onChain ? newState.onChain.credits : 0,
        supportAdjustments: new Map(),
        stagedStatements: [],
      };
      break;
    }
    case "RESET_COMMIT_STATUS": {
      // If the freeze hasn't resolved yet, clear it as a fallback to
      // avoid lingering committed adjustments.
      if (newState.frozenOnChain) {
        newState.frozenOnChain = undefined;
        newState.staged = {
          credits: newState.onChain ? newState.onChain.credits : 0,
          supportAdjustments: new Map(),
          stagedStatements: [],
        };
      }
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
    case "UPDATE_STAGED_INITIAL_SUPPORT": {
      if (!state.staged) break;
      newState.staged = {
        ...state.staged,
        supportAdjustments: new Map(state.staged.supportAdjustments),
        stagedStatements: state.staged.stagedStatements.map((s) =>
          s.tempId === action.payload.tempId
            ? { ...s, initialSupport: action.payload.newSupport }
            : s,
        ),
      };
      break;
    }
    case "SET_PENDING_DRAFT_COST": {
      newState.pendingDraftCost = action.payload.cost;
      break;
    }
    case "RESTORE_STAGED": {
      if (!state.staged) break;
      newState.staged = {
        ...state.staged,
        supportAdjustments: action.payload.supportAdjustments,
        stagedStatements: action.payload.stagedStatements,
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
      const newSupport = getAdjustedSupport(onChainSupport, adjustment);
      totalAdjustmentCost += adjustmentCost(
        onChainSupport,
        newSupport,
        action.creditMultiplier,
      );
    }
    // Include cost for staged new statements
    for (const stmt of newState.staged.stagedStatements) {
      totalAdjustmentCost += adjustmentCost(
        0,
        stmt.initialSupport,
        action.creditMultiplier,
      );
    }
    // Include cost of the in-progress draft (before it is staged)
    totalAdjustmentCost += newState.pendingDraftCost;
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

  return newState;
};

type UserNotVerifiedContextValue = {
  isUserVerified: false;
  isVerifiedLoading: boolean;
  state: undefined;
  dispatch: undefined;
  commitChanges: undefined;
  previewCommitChanges: undefined;
  resetChanges: undefined;
  resetCommitStatus: undefined;
  getEffectiveSupport: undefined;
  getOnChainSupport: undefined;
  hasAdjustment: undefined;
  switchSupport: undefined;
  stageStatement: undefined;
  unstageStatement: undefined;
  updateStagedInitialSupport: undefined;
  setPendingDraftCost: (cost: number) => void;
};

type UserSupportContextValue = {
  isUserVerified: true;
  isVerifiedLoading: boolean;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitChanges: (options?: CommitChangesOptions) => void | Promise<void>;
  previewCommitChanges: () => Promise<CommitPreview | undefined>;
  resetChanges: () => void;
  resetCommitStatus: () => void;
  getEffectiveSupport: (statementId: number) => number;
  getOnChainSupport: (statementId: number) => number;
  hasAdjustment: (statementId: number) => boolean;
  switchSupport: (sourceStatementId: number, targetStatementId: number) => void;
  stageStatement: (text: string, initialSupport?: number) => void;
  unstageStatement: (tempId: string) => void;
  updateStagedInitialSupport: (tempId: string, newSupport: number) => void;
  setPendingDraftCost: (cost: number) => void;
};

export const UserVoteContext = createContext<
  UserNotVerifiedContextValue | UserSupportContextValue | undefined
>(undefined);

export const UserVoteProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [state, rawDispatch] = useReducer(reducer, {
    onChain: undefined,
    staged: undefined,
    hasStagedChanges: false,
    hasEnoughCredits: true,
    commitStatus: "idle",
    pendingDraftCost: 0,
  });
  const { writeContractAsync, previewNetworkFee } = useSponsoredContractWrite();
  const { address: participantAddress, isSmartWalletLoading } =
    useParticipantAddress();
  const publicClient = usePublicClient();
  const {
    forumContractAddress,
    chainFingerprint,
    name: forumName,
    creditMultiplier,
  } = useForum();

  // Wrap dispatch to inject creditMultiplier into every action
  const dispatch = useCallback(
    (action: UserSupportAction) => rawDispatch({ ...action, creditMultiplier }),
    [creditMultiplier],
  );

  // Track authored statements in localStorage for "My Statements"
  const { add: addAuthoredStatement } =
    useLocalStorageSet("authoredStatements");

  const {
    data: isUserVerified,
    refetch: refetchIsMember,
    isLoading: isVerifiedLoading,
  } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: participantAddress,
    functionName: "isMember",
    args: [],
    query: {
      enabled: !!participantAddress,
    },
  });

  const { data: onChainUserStatementSupport, refetch: refetchSupport } =
    useReadContract({
      address: forumContractAddress,
      abi: FORUM_ABI,
      account: participantAddress,
      functionName: "getUserStatementSupport",
      args: [],
      query: {
        enabled: Boolean(participantAddress && isUserVerified),
      },
    });

  const { data: onChainUserBalance, refetch: refetchBalance } = useReadContract(
    {
      address: forumContractAddress,
      abi: FORUM_ABI,
      account: participantAddress,
      functionName: "getUserBalance",
      args: [],
      query: {
        enabled: Boolean(participantAddress && isUserVerified),
      },
    },
  );

  const refetch = useCallback(() => {
    void refetchIsMember();
    if (isUserVerified) {
      void refetchSupport();
      void refetchBalance();
    }
  }, [refetchIsMember, refetchSupport, refetchBalance, isUserVerified]);

  // Sync with blockchain on every new block
  const { blockNumber: latestBlockNumber, triggerSync } = useBlockSync(refetch);

  useEffect(() => {
    // Load state from blockchain
    if (
      onChainUserStatementSupport !== undefined &&
      onChainUserBalance !== undefined
    ) {
      dispatch({
        type: "SYNC_ONCHAIN_STATE",
        payload: {
          credits: onChainUserBalance,
          statementSupport: [...onChainUserStatementSupport],
          blockNumber: latestBlockNumber,
        },
      });
    }
  }, [
    onChainUserStatementSupport,
    onChainUserBalance,
    latestBlockNumber,
    dispatch,
  ]);

  // ── Staged-support persistence ──────────────────────────────────────────
  const persistKey =
    chainFingerprint && participantAddress
      ? stagedStorageKey(
          chainFingerprint,
          forumName,
          participantAddress.slice(0, 10),
        )
      : undefined;
  const restoredKeyRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!persistKey || !state.staged || restoredKeyRef.current === persistKey)
      return;
    restoredKeyRef.current = persistKey;
    const saved = loadStagedFromStorage(persistKey);
    if (
      saved &&
      (saved.supportAdjustments.size > 0 || saved.stagedStatements.length > 0)
    ) {
      dispatch({ type: "RESTORE_STAGED", payload: saved });
    }
  }, [persistKey, state.staged, dispatch]);
  useEffect(() => {
    if (!persistKey || !state.staged) return;
    if (
      state.staged.supportAdjustments.size === 0 &&
      state.staged.stagedStatements.length === 0
    ) {
      clearStagedStorage(persistKey);
    } else {
      saveStagedToStorage(persistKey, state.staged);
    }
  }, [persistKey, state.staged]);

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

      // Trigger an immediate sync so SYNC_ONCHAIN_STATE fires with a current
      // block number and fresh contract data, without waiting for the next poll.
      triggerSync();
    }
  }, [
    txReceipt,
    state.commitStatus,
    state.confirmedBlockNumber,
    addAuthoredStatement,
    triggerSync,
    dispatch,
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
  }, [state.commitStatus, dispatch]);

  const buildCommitRequest = useCallback(async (): Promise<
    ContractWriteRequest | undefined
  > => {
    if (
      state.hasStagedChanges &&
      state.hasEnoughCredits &&
      state.staged &&
      publicClient &&
      participantAddress
    ) {
      const hasSupportAdjustments = state.staged.supportAdjustments.size > 0;

      const calls: `0x${string}`[] = [];

      for (const stmt of state.staged.stagedStatements) {
        calls.push(
          encodeFunctionData({
            abi: FORUM_ABI,
            functionName: "addStatement",
            args: [stmt.text, BigInt(stmt.initialSupport)],
          }),
        );
      }

      if (hasSupportAdjustments) {
        const supportAdjustments: {
          statementId: bigint;
          value: bigint;
          adjustmentType: number;
        }[] = [];
        for (const [statementId, adjustment] of state.staged
          .supportAdjustments) {
          supportAdjustments.push({
            statementId: BigInt(statementId),
            value: BigInt(adjustment.value),
            adjustmentType: adjustment.adjustmentType,
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

      const gasEstimate = await publicClient.estimateContractGas({
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "multicall",
        args: [calls],
        account: participantAddress,
      });

      return {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "multicall",
        args: [calls],
        gas: (gasEstimate * 120n) / 100n,
      };
    }
  }, [
    state.hasStagedChanges,
    state.hasEnoughCredits,
    state.staged,
    publicClient,
    participantAddress,
    forumContractAddress,
  ]);

  const previewCommitChanges = useCallback(async () => {
    if (!state.staged) return undefined;

    const request = await buildCommitRequest();
    if (!request) return undefined;

    return {
      statementCount: state.staged.stagedStatements.length,
      supportAdjustmentCount: state.staged.supportAdjustments.size,
      networkFee: await previewNetworkFee(request),
    };
  }, [buildCommitRequest, previewNetworkFee, state.staged]);

  const commitChanges = useCallback(
    async (options?: CommitChangesOptions) => {
      if (
        state.hasStagedChanges &&
        state.hasEnoughCredits &&
        state.staged &&
        publicClient &&
        participantAddress
      ) {
        dispatch({ type: "BEGIN_COMMIT" });

        try {
          const request = await buildCommitRequest();
          if (!request) {
            throw new Error("No staged changes are ready to commit.");
          }

          const txHash = await writeContractAsync({
            ...request,
            uiOptions: { showWalletUIs: options?.showWalletUIs ?? false },
          });

          dispatch({ type: "COMMIT_SUBMITTED", payload: { txHash } });
        } catch (err: unknown) {
          if (err instanceof BaseError) {
            if (err.shortMessage?.toLowerCase().includes("rejected")) {
              dispatch({ type: "COMMIT_CANCELLED" });
              return;
            }
          }

          dispatch({ type: "COMMIT_ERROR" });
        }
      }
    },
    [
      state,
      writeContractAsync,
      buildCommitRequest,
      publicClient,
      participantAddress,
      dispatch,
    ],
  );

  const resetCommitStatus = useCallback(() => {
    dispatch({ type: "RESET_COMMIT_STATUS" });
  }, [dispatch]);

  // While frozen, rendering reads from the snapshot so the UI stays
  // consistent until the sync catches up to the confirmed block.
  const renderOnChain = state.frozenOnChain ?? state.onChain;

  // Helper function to get effective support (on-chain + adjustment)
  const getEffectiveSupport = useCallback(
    (statementId: number): number => {
      const onChainSupport =
        renderOnChain?.statementSupport.get(statementId) || 0;
      const adjustment = state.staged?.supportAdjustments.get(statementId);
      return adjustment
        ? getAdjustedSupport(onChainSupport, adjustment)
        : onChainSupport;
    },
    [renderOnChain, state.staged],
  );

  // Helper function to get on-chain support (without adjustments)
  const getOnChainSupport = useCallback(
    (statementId: number): number => {
      return renderOnChain?.statementSupport.get(statementId) || 0;
    },
    [renderOnChain],
  );

  // Helper function to check if a statement has a pending adjustment
  const hasAdjustment = useCallback(
    (statementId: number): boolean => {
      return state.staged?.supportAdjustments.has(statementId) || false;
    },
    [state.staged],
  );

  const switchSupport = useCallback(
    (sourceStatementId: number, targetStatementId: number) => {
      dispatch({
        type: "SWITCH_USER_SUPPORT",
        payload: { sourceStatementId, targetStatementId },
      });
    },
    [dispatch],
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

  // Update the initial support value of a staged statement
  const updateStagedInitialSupport = useCallback(
    (tempId: string, newSupport: number) => {
      dispatch({
        type: "UPDATE_STAGED_INITIAL_SUPPORT",
        payload: { tempId, newSupport },
      });
    },
    [dispatch],
  );

  // Set the credit cost of the in-progress draft statement
  const setPendingDraftCost = useCallback(
    (cost: number) => {
      dispatch({ type: "SET_PENDING_DRAFT_COST", payload: { cost } });
    },
    [dispatch],
  );

  const resetChanges = useCallback(() => {
    dispatch({ type: "CLEAR_STAGED_SUPPORT" });
  }, [dispatch]);

  // Verification is still loading if the query is in-flight OR the wallet
  // address hasn't resolved yet (the query won't even start without it).
  const isVerifiedStillLoading =
    isSmartWalletLoading || (!!participantAddress && isVerifiedLoading);

  if (isUserVerified) {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: isUserVerified,
          isVerifiedLoading: !state.onChain,
          state,
          dispatch,
          commitChanges,
          previewCommitChanges,
          resetChanges,
          resetCommitStatus,
          getEffectiveSupport,
          getOnChainSupport,
          hasAdjustment,
          switchSupport,
          stageStatement,
          unstageStatement,
          updateStagedInitialSupport,
          setPendingDraftCost,
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
          isVerifiedLoading: isVerifiedStillLoading,
          state: undefined,
          dispatch: undefined,
          commitChanges: undefined,
          previewCommitChanges: undefined,
          resetChanges: undefined,
          resetCommitStatus: undefined,
          getEffectiveSupport: undefined,
          getOnChainSupport: undefined,
          hasAdjustment: undefined,
          switchSupport: undefined,
          stageStatement: undefined,
          unstageStatement: undefined,
          updateStagedInitialSupport: undefined,
          setPendingDraftCost,
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
