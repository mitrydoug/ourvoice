import { FC } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export type SortMode = "top" | "relevant" | "latest";

interface SortTabsProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
  /** When false, "Relevant" and "Latest" tabs are disabled. */
  hasSearch?: boolean;
}

const TAB_INDEX: Record<SortMode, number> = {
  top: 0,
  relevant: 1,
  latest: 2,
};
const INDEX_TAB: SortMode[] = ["top", "relevant", "latest"];

const SortTabs: FC<SortTabsProps> = ({ value, onChange, hasSearch = true }) => (
  <Box
    sx={{
      borderBottom: 1,
      borderColor: "divider",
      mb: 1,
      position: "sticky",
      top: 0,
      zIndex: 2,
      bgcolor: "background.default",
      // Extend background wider than cards to cover drop-shadow bleed
      mx: -3,
      px: 3,
    }}
  >
    <Tabs
      value={TAB_INDEX[value]}
      onChange={(_, idx: number) => {
        onChange(INDEX_TAB[idx]);
      }}
    >
      <Tab label="Top" />
      <Tab label="Relevant" disabled={!hasSearch} />
      <Tab label="Latest" disabled={!hasSearch} />
    </Tabs>
  </Box>
);

export default SortTabs;
