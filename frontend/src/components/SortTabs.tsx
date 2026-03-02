import { FC } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export type SortMode = "top" | "relevant";

interface SortTabsProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
  relevantDisabled: boolean;
}

const TAB_INDEX: Record<SortMode, number> = { top: 0, relevant: 1 };
const INDEX_TAB: SortMode[] = ["top", "relevant"];

const SortTabs: FC<SortTabsProps> = ({ value, onChange, relevantDisabled }) => (
  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
    <Tabs
      value={TAB_INDEX[value]}
      onChange={(_, idx: number) => {
        const mode = INDEX_TAB[idx];
        if (mode === "relevant" && relevantDisabled) return;
        onChange(mode);
      }}
    >
      <Tab label="Top" />
      <Tab label="Relevant" disabled={relevantDisabled} />
    </Tabs>
  </Box>
);

export default SortTabs;
