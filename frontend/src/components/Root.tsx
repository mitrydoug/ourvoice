import { FC, useEffect, useState } from "react";
import Box from "@mui/material/Box";
import { Button, Fab } from "@mui/material";
import { Outlet, useLocation, useParams } from "react-router-dom";
import CreateIcon from "@mui/icons-material/Create";

import MenuAppBar from "./AppBar";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import CreateStatementModal from "./CreateStatementModal";
import SearchField from "./SearchField";
import UserProfilePanel from "./UserProfilePanel";
import useIsMobile from "@/hooks/useIsMobile";
import { useUserVotes } from "../state/UserVotes";
import CommitSupportModal from "./CommitSupportModal";
import { SearchProvider, useSearchQuery } from "@/state/Search";
import { useForum } from "../state/Forum";
import { useWalletAuth } from "@/wallet";

/**
 * Sync the `:forumSlug` URL param → ForumProvider context.
 * Runs on every route change so the context always matches the URL.
 */
const useForumSlugSync = () => {
  const { forumSlug } = useParams<{ forumSlug: string }>();
  const { syncFromSlug } = useForum();

  useEffect(() => {
    if (forumSlug) {
      syncFromSlug(forumSlug);
    }
  }, [forumSlug, syncFromSlug]);
};

/* ── Right column: user profile pill / connect wallet ──────────────────── */

const RightColumn: FC = () => {
  const { address, connect, isLoading } = useWalletAuth();

  if (!address) {
    return (
      <Button onClick={connect} size="medium" fullWidth disabled={isLoading}>
        Connect Wallet
      </Button>
    );
  }

  return <UserProfilePanel />;
};

/* ── Desktop: 3-column layout ─────────────────────────────────────────── */

const DesktopLayout: FC = () => {
  const location = useLocation();
  const {
    query: localQuery,
    setQuery: setSearchQuery,
    clearQuery: clearSearch,
  } = useSearchQuery();

  const hideSearch =
    location.pathname.endsWith("/write") ||
    location.pathname.endsWith("/settings") ||
    location.pathname.endsWith("/how-it-works") ||
    location.pathname.includes("/statement/");

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
          pt: 1.5,
          px: 3,
          pb: 3,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <SideNav />
      </Box>

      {/* Middle column – search, tabs, statements */}
      <Box
        sx={{
          width: 600,
          maxWidth: 600,
          minWidth: 0,
          flexShrink: 1,
          display: "flex",
          flexDirection: "column",
          borderRight: "1px solid",
          borderColor: "divider",
          overflow: "hidden",
        }}
      >
        {/* Fixed search header */}
        {!hideSearch && (
          <Box sx={{ px: 3, pt: 3, pb: 1, flexShrink: 0 }}>
            <SearchField
              value={localQuery}
              onChange={setSearchQuery}
              onClear={clearSearch}
              fullWidth
            />
          </Box>
        )}

        {/* Scrollable content area */}
        <Box
          sx={{
            flex: 1,
            overflowY: "auto",
            px: 3,
            pt: hideSearch ? 1.5 : 0,
            pb: 8,
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
          <Outlet />
        </Box>
      </Box>

      {/* Right column – user profile */}
      <Box
        sx={{
          width: 280,
          flexShrink: 0,
          overflowY: "auto",
          p: 3,
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        <RightColumn />
      </Box>
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
  const { state: userVoteState, resetCommitStatus } = useUserVotes();
  useForumSlugSync();

  return (
    <SearchProvider>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}
      {userVoteState && resetCommitStatus && (
        <CommitSupportModal
          commitStatus={userVoteState.commitStatus}
          onReset={resetCommitStatus}
        />
      )}
    </SearchProvider>
  );
};

export default Root;
