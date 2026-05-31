import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { Avatar, Button, Stack } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { useUserVotes } from "../state/UserVotes";
import ChooseForumModal, { FORUMS } from "./ChooseForumModal";
import ForumIcon from "./ForumIcon";
import { useForum, forumToSlug } from "../state/Forum";
import { metamaskIcon, shortenAddress } from "../util";
import useIsMobile from "@/hooks/useIsMobile";
import useNickname from "@/hooks/useNickname";
import { useTheme } from "@mui/material/styles";
import { ProfileDrawer } from "./UserProfileMenu";
import { useSearchQuery } from "@/state/Search";
import SearchField from "./SearchField";
import { useForumNavigate, useForumPath } from "../hooks/useForumNavigate";
import { useWalletAuth } from "@/hooks/useWalletAuth";

// Sub-components
interface ForumSelectorProps {
  forumName: string;
  onClick: () => void;
}

const ForumSelector: React.FC<ForumSelectorProps> = ({
  forumName,
  onClick,
}) => (
  <Box
    onClick={onClick}
    sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
    aria-controls="menu-appbar"
    aria-haspopup="true"
  >
    <ForumIcon forum={FORUMS[forumName]} size="1.2rem" />
  </Box>
);

interface LogoProps {
  isMobile: boolean;
  homePath: string;
}

const Logo: React.FC<LogoProps> = ({ isMobile, homePath }) => {
  const theme = useTheme();

  return (
    <Link to={homePath} style={{ textDecoration: "none" }}>
      <img
        src="./symvolia-logo.svg"
        alt="Symvolia"
        style={{
          height: isMobile
            ? theme.custom.appBar.logoIcon.size.mobile
            : theme.custom.appBar.logoIcon.size.desktop,
          width: "auto",
        }}
      />
    </Link>
  );
};

export default function MenuAppBar() {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [avatar, setAvatar] = useState<string | null>(null);
  const {
    address,
    connect,
    disconnect: doDisconnect,
    ready: walletAuthReady,
  } = useWalletAuth();
  const isMobile = useIsMobile();
  const [chooseForumModalOpen, setChooseForumModalOpen] = useState(false);
  const { name: forumName, setForum } = useForum();
  const navigate = useForumNavigate();
  const rawNavigate = useNavigate();
  const forumPath = useForumPath();
  const [nickname] = useNickname();
  const displayName = nickname || (address ? shortenAddress(address) : "");

  const {
    query: localQuery,
    setQuery: setSearchQuery,
    clearQuery: clearSearch,
  } = useSearchQuery();

  useEffect(() => {
    if (address) {
      setAvatar(metamaskIcon(address));
    } else {
      setAvatar(null);
    }
  }, [address]);

  const {
    isUserVerified,
    commitChanges,
    state: userVoteState,
  } = useUserVotes();

  return (
    <>
      <AppBar
        position="sticky"
        color="transparent"
        elevation={0}
        sx={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          bgcolor: "background.default",
        }}
      >
        <Toolbar
          disableGutters
          sx={{
            flexDirection: "column",
            alignItems: "stretch",
            maxWidth: "1000px",
            width: "100%",
            mx: "auto",
            px: 3,
            py: 1,
          }}
        >
          {/* First row: Three-section layout */}
          {isMobile ? (
            <Stack direction="row" alignItems="center" sx={{ width: "100%" }}>
              {/* Left section: Forum icon */}
              <Box
                sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}
              >
                <ForumSelector
                  forumName={forumName}
                  onClick={() => setChooseForumModalOpen(true)}
                />
              </Box>

              {/* Center section: Logo */}
              <Box sx={{ flex: 1, display: "flex", justifyContent: "center" }}>
                <Logo isMobile={isMobile} homePath={forumPath("/")} />
              </Box>

              {/* Right section: Profile */}
              <Box
                sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}
              >
                {address ? (
                  <>
                    <IconButton
                      size="medium"
                      aria-label="profile of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      onClick={() => setDrawerOpen(true)}
                      color="inherit"
                    >
                      <Avatar src={avatar ?? undefined} />
                    </IconButton>
                    <ProfileDrawer
                      open={drawerOpen}
                      onClose={() => setDrawerOpen(false)}
                      isUserVerified={isUserVerified}
                      navigate={(path: string) => void navigate(path)}
                      disconnect={doDisconnect}
                      username={displayName}
                      avatar={avatar}
                      commitChanges={commitChanges ?? (() => {})}
                      hasStagedChanges={
                        userVoteState?.hasStagedChanges ?? false
                      }
                      commitBusy={
                        userVoteState?.commitStatus !== undefined &&
                        userVoteState?.commitStatus !== "idle"
                      }
                      hasEnoughCredits={userVoteState?.hasEnoughCredits ?? true}
                    />
                  </>
                ) : (
                  <Button
                    onClick={connect}
                    size="small"
                    disabled={!walletAuthReady}
                  >
                    <Typography variant="body1" component="div">
                      Connect
                    </Typography>
                  </Button>
                )}
              </Box>
            </Stack>
          ) : (
            <Stack direction="row" spacing={2} alignItems="center" flexGrow={1}>
              {/* Desktop layout */}
              <Logo isMobile={isMobile} homePath={forumPath("/")} />

              <ForumSelector
                forumName={forumName}
                onClick={() => setChooseForumModalOpen(true)}
              />

              <SearchField
                value={localQuery}
                onChange={setSearchQuery}
                onClear={clearSearch}
              />

              {!address && (
                <Button
                  onClick={connect}
                  size="medium"
                  disabled={!walletAuthReady}
                >
                  <Typography variant="body1" component="div">
                    Connect
                  </Typography>
                </Button>
              )}
            </Stack>
          )}

          {/* Second row on mobile: Search bar */}
          {isMobile && (
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mt: 1, width: "100%" }}
            >
              <SearchField
                value={localQuery}
                onChange={setSearchQuery}
                onClear={clearSearch}
                fullWidth
              />
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <ChooseForumModal
        open={chooseForumModalOpen}
        onClose={() => setChooseForumModalOpen(false)}
        chooseForum={(forum: string) => {
          setForum(forum);
          setChooseForumModalOpen(false);
          const slug = forumToSlug(forum);
          void rawNavigate(`/${slug}`);
        }}
      />
    </>
  );
}
