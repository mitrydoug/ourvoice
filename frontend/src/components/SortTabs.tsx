import { FC } from "react";
import { Box, Tab, Tabs } from "@mui/material";

export type SortMode = "top" | "trending" | "latest";

interface SortTabsProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
}

const TAB_INDEX: Record<SortMode, number> = {
  top: 0,
  trending: 1,
  latest: 2,
};
const INDEX_TAB: SortMode[] = ["top", "trending", "latest"];

const SortTabs: FC<SortTabsProps> = ({ value, onChange }) => (
  <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 1 }}>
    <Tabs
      value={TAB_INDEX[value]}
      onChange={(_, idx: number) => {
        onChange(INDEX_TAB[idx]);
      }}
    >
      <Tab label="Top" />
      <Tab label="Trending" />
      <Tab label="Latest" />
    </Tabs>
  </Box>
);

export default SortTabs;
