import { useMemo } from "react";
import { useUserVotes } from "../state/UserVotes";

/** Triangle number cost for a given support level */
const creditCost = (support: number): number => {
  return (support * (support + 1)) / 2;
};

export interface CreditAllocation {
  /** Credits committed on-chain (minus any pending decreases) */
  allocated: number;
  /** Credits tied up in pending adjustments (increases + decreases) */
  staged: number;
  /** Credits available to allocate */
  unallocated: number;
  /** Total credits the user has */
  total: number;
}

/**
 * Computes the breakdown of a verified user's credit allocation
 * into allocated (committed), staged (pending), and unallocated segments.
 *
 * Returns null when the user is not verified or data is unavailable.
 */
export const useCreditAllocation = (): CreditAllocation | null => {
  const userVotes = useUserVotes();

  return useMemo(() => {
    if (
      !userVotes.isUserVerified ||
      !userVotes.state.onChain ||
      !userVotes.state.staged
    ) {
      return null;
    }

    const { onChain, staged } = userVotes.state;

    // Total on-chain cost (committed credits)
    let totalOnChainCost = 0;
    for (const [, support] of onChain.statementSupport) {
      totalOnChainCost += creditCost(support);
    }

    // Pending adjustment impact
    let totalDecreaseCost = 0;
    let totalIncreaseCost = 0;

    for (const [statementId, adjustment] of staged.supportAdjustments) {
      const onChainSupport = onChain.statementSupport.get(statementId) || 0;
      const effectiveSupport = onChainSupport + adjustment;

      const onChainC = creditCost(onChainSupport);
      const effectiveC = creditCost(effectiveSupport);

      if (adjustment < 0) {
        totalDecreaseCost += onChainC - effectiveC;
      } else if (adjustment > 0) {
        totalIncreaseCost += effectiveC - onChainC;
      }
    }

    // Include cost for staged new statements
    for (const stmt of staged.stagedStatements) {
      if (stmt.initialSupport !== 0) {
        totalIncreaseCost += creditCost(stmt.initialSupport);
      }
    }

    // Include cost of the in-progress draft (before it is staged)
    const draftCost = userVotes.state.pendingDraftCost;
    totalIncreaseCost += draftCost;

    const allocated = totalOnChainCost - totalDecreaseCost;
    const stagedAmount = totalDecreaseCost + totalIncreaseCost;
    const unallocated = onChain.credits - totalIncreaseCost;
    const total = allocated + stagedAmount + unallocated;

    return { allocated, staged: stagedAmount, unallocated, total };
  }, [userVotes]);
};
