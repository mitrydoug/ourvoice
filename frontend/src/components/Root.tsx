import { FC, useState } from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Fab } from "@mui/material";
import CreateIcon from "@mui/icons-material/Create";

import MenuAppBar from "./AppBar";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import CreateStatementModal from "./CreateStatementModal";
import SearchField from "./SearchField";
import useIsMobile from "@/hooks/useIsMobile";
import { useUserVotes } from "../state/UserVotes";
import { SearchProvider, useSearchQuery } from "@/state/Search";

/* ── Desktop: 3-column layout ─────────────────────────────────────────── */

const DesktopLayout: FC = () => {
  const {
    query: localQuery,
    setQuery: setSearchQuery,
    clearQuery: clearSearch,
  } = useSearchQuery();

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Left column – logo, profile, navigation */}
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          borderRight: "1px solid",
          borderColor: "divider",
          overflowY: "auto",
          p: 3,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <SideNav />
      </Box>

      {/* Middle column – search, tabs, statements */}
      <Box
        sx={{
          width: 700,
          flexShrink: 0,
          overflowY: "auto",
          px: 3,
          pt: 3,
          pb: 8,
          borderRight: "1px solid",
          borderColor: "divider",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Box sx={{ mb: 2 }}>
          <SearchField
            value={localQuery}
            onChange={setSearchQuery}
            onClear={clearSearch}
            fullWidth
          />
        </Box>
        <Outlet />
      </Box>

      {/* Right column – empty for now (mirrors left column width for balance) */}
      <Box sx={{ width: 280, flexShrink: 0 }} />
    </Box>
  );
};

/* ── Mobile: AppBar + content + BottomNav ──────────────────────────────── */

const MobileLayout: FC = () => {
  const { isUserVerified } = useUserVotes();
  const [writeModalOpen, setWriteModalOpen] = useState(false);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <MenuAppBar />

      <Box
        component="main"
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "visible",
          pt: 2,
          pb: 14,
          px: 2,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <Outlet />
      </Box>

      <BottomNav />

      <Fab
        color="primary"
        aria-label="write"
        onClick={() => setWriteModalOpen(true)}
        disabled={!isUserVerified}
        sx={{
          position: "fixed",
          bottom: 80,
          right: 24,
          zIndex: 1201,
        }}
      >
        <CreateIcon />
      </Fab>
      <CreateStatementModal
        open={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
      />
    </Box>
  );
};

/* ── Root ───────────────────────────────────────────────────────────────── */

const Root: FC = () => {
  const isMobile = useIsMobile();

  return (
    <SearchProvider>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
    </SearchProvider>
  );
};

export default Root;
