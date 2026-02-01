import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import {
  Avatar,
  Button,
  InputAdornment,
  Stack,
  TextField,
} from "@mui/material";
import { useAccount, useDisconnect } from "wagmi";
import { Link, useNavigate } from "react-router-dom";
import { useUserVotes } from "../state/UserVotes";
import CreateIcon from "@mui/icons-material/Create";
import WriteModal from "./WriteModal";
import ChooseForumModal, { FORUMS } from "./ChooseForumModal";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import SearchIcon from "@mui/icons-material/Search";
import { useForum } from "../state/Forum";
import { metamaskIcon } from "../util";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import SearchModal from "./SearchModal";
import useIsMobile from "@/hooks/useIsMobile";
import { useTheme } from "@mui/material/styles";
import { AccountMenu, AccountDrawer } from "./AccountMenu";

const MIC_ICON = (
  <svg
    fill="currentColor"
    version="1.1"
    id="Capa_1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 383 383"
    xmlSpace="preserve"
  >
    <g id="SVGRepo_bgCarrier" strokeWidth="0" />

    <g
      id="SVGRepo_tracerCarrier"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    <g id="SVGRepo_iconCarrier">
      {" "}
      <g>
        {" "}
        <path d="M348.476,64.279c0-35.5-28.781-64.279-64.275-64.279c-15.541,0-29.775,5.52-40.892,14.705 c4.969,16.941,14.627,33.927,28.717,48.696c18.767,19.641,42.903,32.382,66.291,35.434 C344.721,88.851,348.476,77.021,348.476,64.279z" />{" "}
        <path d="M266.356,68.833c-13.931-14.593-23.692-31.29-29.271-48.165c-8.015,8.652-13.602,19.496-15.886,31.512 c6.071,17.232,16.956,33.656,31.69,47.364c13.786,12.818,29.731,22.107,46.09,27.216c13.565-3.186,25.455-10.629,34.188-20.898 C309.332,101.687,285.226,88.592,266.356,68.833z" />{" "}
        <path d="M118.311,340.647c-12.066,10.015-51.748,7.069-73.949,2.886c-4.248-0.846-8.354,1.991-9.169,6.256 c-0.793,4.26,1.994,8.371,6.255,9.169c3.635,0.688,23.033,4.184,43.351,4.184c16.584,0,33.796-2.328,43.528-10.396 c5.723-4.713,8.725-11.116,8.725-18.454c0-21.027-12.822-30.949-23.121-38.96c-9.748-7.559-15.747-12.724-16.164-23.243 c-0.519-13.369,4.695-22.378,9.69-27.912c11.664,10.331,34.099,7.947,50.594-5.614l23.612-19.38 c3.072,3.879,7.372,6.732,12.389,7.774v122.876c-35.971,1.286-63.492,8.279-63.492,16.743c0,9.369,33.685,16.959,75.268,16.959 c41.581,0,75.268-7.59,75.268-16.959c0-8.464-27.523-15.457-63.494-16.743V215.471c1.451-2.897,2.332-6.104,2.332-9.538 c0-5.325-2.008-10.118-5.213-13.873l73.973-60.692c-14.643-5.761-28.749-14.555-41.152-26.077 c-13.324-12.405-23.695-26.96-30.496-42.36l-60.063,73.869c-5.853-2.495-12.894-1.318-17.521,3.573 c-5.244,5.504-5.708,13.833-1.499,19.825l-27.154,33.394c-9.123,11.226-12.804,24.902-10.922,36.035 c-8.157,7.249-18.659,20.959-17.805,43.067c0.725,18.37,12.635,27.607,22.217,35.037c9.521,7.39,17.054,13.232,17.054,26.554 C121.351,336.985,120.447,338.884,118.311,340.647z" />{" "}
      </g>{" "}
    </g>
  </svg>
);

// Sub-components
interface ForumSelectorProps {
  forumName: string;
  onClick: () => void;
}

const ForumSelector: React.FC<ForumSelectorProps> = ({
  forumName,
  onClick,
}) => (
  <IconButton
    size="medium"
    aria-controls="menu-appbar"
    aria-haspopup="true"
    onClick={onClick}
    color="inherit"
  >
    <Avatar
      src={FORUMS[forumName].iconSrc}
      variant="rounded"
      style={{ height: "1.7rem", width: "1.7rem" }}
    />
  </IconButton>
);

interface LogoProps {
  isMobile: boolean;
}

const Logo: React.FC<LogoProps> = ({ isMobile }) => {
  const theme = useTheme();

  return (
    <Link to="/" style={{ textDecoration: "none" }}>
      <Stack
        direction="row"
        alignItems="center"
        spacing={{ xs: 0.5, md: 1 }}
        sx={{ color: "primary.main", cursor: "pointer" }}
      >
        <Box
          sx={{
            height: {
              xs: theme.custom.appBar.logoIcon.size.mobile,
              md: theme.custom.appBar.logoIcon.size.desktop,
            },
            width: {
              xs: theme.custom.appBar.logoIcon.size.mobile,
              md: theme.custom.appBar.logoIcon.size.desktop,
            },
            flexShrink: 0,
          }}
        >
          {MIC_ICON}
        </Box>
        <Typography
          component="div"
          sx={{
            fontFamily: "Sriracha",
            fontWeight: "bold",
            color: "primary.main",
            whiteSpace: "nowrap",
            fontSize: isMobile
              ? theme.custom.appBar.logoText.size.mobile
              : theme.custom.appBar.logoText.size.desktop,
          }}
        >
          Our Voice
        </Typography>
      </Stack>
    </Link>
  );
};

interface SearchFieldProps {
  onClick: () => void;
  fullWidth?: boolean;
}

const SearchField: React.FC<SearchFieldProps> = ({
  onClick,
  fullWidth = false,
}) => (
  <TextField
    placeholder="Search..."
    size="small"
    onClick={onClick}
    slotProps={{
      input: {
        readOnly: true,
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon fontSize="small" />
          </InputAdornment>
        ),
        sx: { cursor: "pointer", backgroundColor: "white" },
      },
    }}
    sx={{
      width: fullWidth ? "100%" : "auto",
      flexGrow: 1,
      "& .MuiOutlinedInput-root": {
        cursor: "pointer",
        backgroundColor: "white",
      },
    }}
  />
);

interface UserActionsProps {
  userVoteState: {
    staged: { credits: number };
    onChain?: { credits: number };
    hasStagedChanges: boolean;
  };
  commitSupport: () => void;
  onWriteClick: () => void;
}

const UserActions: React.FC<UserActionsProps> = ({
  userVoteState,
  commitSupport,
  onWriteClick,
}) => (
  <>
    <Stack alignItems="center" spacing={0}>
      <Typography variant="body2">Credits</Typography>
      <Typography variant="body1">
        {userVoteState.staged.credits}/{userVoteState.onChain?.credits}
      </Typography>
    </Stack>
    <IconButton
      onClick={commitSupport}
      disabled={!userVoteState.hasStagedChanges}
    >
      <DoneAllIcon
        sx={{
          color: userVoteState.hasStagedChanges ? "primary.main" : "",
        }}
      />
    </IconButton>
    <Button startIcon={<CreateIcon />} onClick={onWriteClick}>
      <Typography variant="body1" component="div">
        Write
      </Typography>
    </Button>
  </>
);

export default function MenuAppBar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [avatar, setAvatar] = useState<string | null>(null);
  const { address } = useAccount();
  const isMobile = useIsMobile();
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [chooseForumModalOpen, setChooseForumModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const { name: forumName, setForum } = useForum();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  const [connectRequested, setConnectRequested] = useState(false);
  const { connect, isConnected } = useWeb3AuthConnect();

  useEffect(() => {
    if (!isConnected && connectRequested) {
      connect();
      console.log("Connecting to wallet...");
      setConnectRequested(false);
    }
  }, [isConnected, connectRequested, connect]);

  useEffect(() => {
    if (address) {
      setAvatar(metamaskIcon(address));
    } else {
      setAvatar(null);
    }
  }, [address]);

  const {
    isUserVerified,
    commitSupport,
    state: userVoteState,
  } = useUserVotes();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    console.log("here! ");
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  console.log("userVoteState", userVoteState);

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ mt: 2 }}
      >
        <Toolbar
          disableGutters
          sx={{ flexDirection: "column", alignItems: "stretch" }}
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
                <Logo isMobile={isMobile} />
              </Box>

              {/* Right section: Account */}
              <Box
                sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}
              >
                {address ? (
                  <>
                    <IconButton
                      size="medium"
                      aria-label="account of current user"
                      aria-controls="menu-appbar"
                      aria-haspopup="true"
                      onClick={() => setDrawerOpen(true)}
                      color="inherit"
                    >
                      <Avatar src={avatar ?? undefined} />
                    </IconButton>
                    <AccountDrawer
                      open={drawerOpen}
                      onClose={() => setDrawerOpen(false)}
                      isUserVerified={isUserVerified}
                      navigate={navigate}
                      disconnect={disconnect}
                      avatar={avatar}
                      commitSupport={commitSupport ?? (() => { })}
                      hasStagedChanges={userVoteState?.hasStagedChanges ?? false}
                    />
                  </>
                ) : (
                  <Button
                    onClick={() => setConnectRequested(true)}
                    size="small"
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
              <Logo isMobile={isMobile} />

              <ForumSelector
                forumName={forumName}
                onClick={() => setChooseForumModalOpen(true)}
              />

              <SearchField onClick={() => setSearchModalOpen(true)} />

              {isUserVerified && (
                <UserActions
                  userVoteState={userVoteState}
                  commitSupport={commitSupport}
                  onWriteClick={() => setWriteModalOpen(true)}
                />
              )}

              {address ? (
                <>
                  <IconButton
                    size="medium"
                    aria-label="account of current user"
                    aria-controls="menu-appbar"
                    aria-haspopup="true"
                    aria-describedby={id}
                    onClick={handleMenu}
                    color="inherit"
                  >
                    <Avatar src={avatar ?? undefined} />
                  </IconButton>
                  <AccountMenu
                    anchorEl={anchorEl}
                    open={open}
                    onClose={handleClose}
                    isUserVerified={isUserVerified}
                    navigate={navigate}
                    disconnect={disconnect}
                  />
                </>
              ) : (
                <Button onClick={() => setConnectRequested(true)} size="medium">
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
              <SearchField onClick={() => setSearchModalOpen(true)} fullWidth />
            </Stack>
          )}
        </Toolbar>
      </AppBar>
      <WriteModal
        open={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
      />
      <ChooseForumModal
        open={chooseForumModalOpen}
        onClose={() => setChooseForumModalOpen(false)}
        chooseForum={(forum: string) => {
          setForum(forum as "global" | "us");
          setChooseForumModalOpen(false);
        }}
      />
      <SearchModal
        open={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
      />
    </>
  );
}
