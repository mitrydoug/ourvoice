import { useMemo } from "react";
import { SupportAdjustmentType, useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import { partsToCredits } from "../util";

/** Quadratic cost for a given support level in credit parts (matches on-chain formula). */
const creditCost = (support: number, creditMultiplier: number): number => {
  const abs = Math.abs(support);
  return (abs * (abs + creditMultiplier)) / (2 * creditMultiplier);
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
  const { creditMultiplier } = useForum();

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
      totalOnChainCost += creditCost(support, creditMultiplier);
    }

    // Pending adjustment impact
    let totalDecreaseCost = 0;
    let totalIncreaseCost = 0;

    for (const [statementId, adjustment] of staged.supportAdjustments) {
      const onChainSupport = onChain.statementSupport.get(statementId) || 0;
      const effectiveSupport =
        adjustment.adjustmentType === SupportAdjustmentType.SetTo
          ? adjustment.value
          : onChainSupport + adjustment.value;

      const onChainC = creditCost(onChainSupport, creditMultiplier);
      const effectiveC = creditCost(effectiveSupport, creditMultiplier);
      const costChange = effectiveC - onChainC;

      if (costChange < 0) {
        totalDecreaseCost += -costChange;
      } else if (costChange > 0) {
        totalIncreaseCost += costChange;
      }
    }

    // Include cost for staged new statements
    for (const stmt of staged.stagedStatements) {
      if (stmt.initialSupport !== 0) {
        totalIncreaseCost += creditCost(stmt.initialSupport, creditMultiplier);
      }
    }

    // Include cost of the in-progress draft (before it is staged)
    const draftCost = userVotes.state.pendingDraftCost;
    totalIncreaseCost += draftCost;

    const allocated = totalOnChainCost - totalDecreaseCost;
    const stagedAmount = totalDecreaseCost + totalIncreaseCost;
    const unallocated = onChain.credits - totalIncreaseCost;
    const total = allocated + stagedAmount + unallocated;

    return {
      allocated: partsToCredits(allocated, creditMultiplier),
      staged: partsToCredits(stagedAmount, creditMultiplier),
      unallocated: partsToCredits(unallocated, creditMultiplier),
      total: partsToCredits(total, creditMultiplier),
    };
  }, [userVotes, creditMultiplier]);
};
