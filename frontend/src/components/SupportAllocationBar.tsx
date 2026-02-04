import React, { useMemo } from "react";
import { Box } from "@mui/material";
import { useUserVotes } from "../state/UserVotes";

// Helper function to calculate credit cost for a given support level
const creditCost = (support: number): number => {
  return (support * (support + 1)) / 2;
};

// Component to display the support allocation progress bar
export const SupportAllocationBar: React.FC = () => {
  const userVotes = useUserVotes();

  const { blueSegment, yellowSegment, greenSegment, total } = useMemo(() => {
    if (
      !userVotes.isUserVerified ||
      !userVotes.state.onChain ||
      !userVotes.state.staged
    ) {
      return { blueSegment: 0, yellowSegment: 0, greenSegment: 0, total: 0 };
    }

    const { onChain, staged } = userVotes.state;

    // Calculate total on-chain cost (committed credits)
    let totalOnChainCost = 0;
    for (const [, support] of onChain.statementSupport) {
      totalOnChainCost += creditCost(support);
    }

    // Calculate adjustment impact (pending changes)
    let totalDecreaseCost = 0;
    let totalIncreaseCost = 0;

    for (const [statementId, adjustment] of staged.supportAdjustments) {
      const onChainSupport = onChain.statementSupport.get(statementId) || 0;
      const effectiveSupport = onChainSupport + adjustment;

      const onChainCost = creditCost(onChainSupport);
      const effectiveCost = creditCost(effectiveSupport);

      if (adjustment < 0) {
        // Decrease - credits being freed up
        totalDecreaseCost += onChainCost - effectiveCost;
      } else if (adjustment > 0) {
        // Increase - credits being used
        totalIncreaseCost += effectiveCost - onChainCost;
      }
    }

    const blue = totalOnChainCost - totalDecreaseCost;
    const yellow = totalDecreaseCost + totalIncreaseCost;
    const green = onChain.credits - totalIncreaseCost;
    const total = blue + yellow + green;

    return {
      blueSegment: blue,
      yellowSegment: yellow,
      greenSegment: green,
      total,
    };
  }, [userVotes]);

  if (total === 0) {
    return null;
  }

  const bluePercent = (blueSegment / total) * 100;
  const yellowPercent = (yellowSegment / total) * 100;
  const greenPercent = (greenSegment / total) * 100;

  return (
    <Box sx={{ width: "100%", mb: 0 }}>
      <Box
        sx={{
          display: "flex",
          height: 8,
          overflow: "hidden",
          backgroundColor: "grey.200",
        }}
      >
        {bluePercent > 0 && (
          <Box
            sx={{
              width: `${bluePercent}%`,
              backgroundColor: "primary.main",
              transition: "width 0.3s ease-out",
            }}
          />
        )}
        {yellowPercent > 0 && (
          <Box
            sx={{
              width: `${yellowPercent}%`,
              backgroundColor: "warning.main",
              transition: "width 0.3s ease-out",
            }}
          />
        )}
        {greenPercent > 0 && (
          <Box
            sx={{
              width: `${greenPercent}%`,
              backgroundColor: "success.main",
              transition: "width 0.3s ease-out",
            }}
          />
        )}
      </Box>
    </Box>
  );
};
