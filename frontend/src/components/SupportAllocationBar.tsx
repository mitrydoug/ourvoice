import React from "react";
import { Box } from "@mui/material";
import { useCreditAllocation } from "@/hooks/useCreditAllocation";

// Component to display the support allocation progress bar
export const SupportAllocationBar: React.FC = () => {
  const allocation = useCreditAllocation();

  if (!allocation || allocation.total === 0) {
    return null;
  }

  const bluePercent = (allocation.allocated / allocation.total) * 100;
  const yellowPercent = (allocation.staged / allocation.total) * 100;
  const greenPercent = (allocation.unallocated / allocation.total) * 100;

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
