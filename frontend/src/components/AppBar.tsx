import React, { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import { Avatar, Button, Divider, ListItemIcon, Menu, MenuItem, Paper, Popover, Stack } from "@mui/material";
import jazzicon from "@metamask/jazzicon";
import { useAccount, useDisconnect } from "wagmi";
import { Link, useNavigate } from "react-router-dom";
import { useUserVotes } from "../state/UserVotes";
import CreateIcon from "@mui/icons-material/Create";
import WriteModal from "./WriteModal";
import ChooseForumModal, { FORUMS } from "./ChooseForumModal";
import LogoutIcon from '@mui/icons-material/Logout';
import DoneAllIcon from "@mui/icons-material/DoneAll";
import Settings from '@mui/icons-material/Settings';
import Logout from '@mui/icons-material/Logout';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { useForum } from "../state/Forum";

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

const metamaskIcon = (address: string) => {
  console.log(address);
  const jazziconData = jazzicon(16, parseInt(address.slice(2, 10), 16));
  const jazziconSvg = new XMLSerializer().serializeToString(
    jazziconData.children[0],
  );
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
};

export default function MenuAppBar() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const [avatar, setAvatar] = useState<string | null>(null);
  const { address } = useAccount();
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [chooseForumModalOpen, setChooseForumModalOpen] = useState(false);
  const { name: forumName, setForum } = useForum();
  const navigate = useNavigate();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    if (address) {
      setAvatar(metamaskIcon(address));
    } else {
      setAvatar(null);
    }
  }, [address]);

  const { isUserVerified, commitVotes, state: userVoteState } = useUserVotes();

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    console.log("here! ");
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);
  const id = open ? "simple-popover" : undefined;

  console.log('userVoteState', userVoteState);

  return (
    <>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ mt: 2 }}
      >
        <Toolbar disableGutters>
          <Stack direction="row" spacing={2} alignItems="center" flexGrow={1}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Stack
                direction="row"
                alignItems="center"
                sx={{ color: "primary.main", cursor: "pointer" }}
              >
                <Box sx={{ height: "2.75rem", width: "2.75rem" }}>{MIC_ICON}</Box>
                <Typography
                  variant="h4"
                  component="div"
                  sx={{
                    fontFamily: "Sriracha",
                    fontWeight: "bold",
                    color: "primary.main",
                  }}
                >
                  Our Voice
                </Typography>
              </Stack>
            </Link>
            <IconButton
              size="medium"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={() => {
                setChooseForumModalOpen(true);
              }}
              color="inherit"
            >
              <Avatar
                src={FORUMS[forumName].iconSrc}
                variant="rounded"
                style={{ height: "1.7rem", width: "1.7rem" }}
              />
            </IconButton>

            <span style={{ flexGrow: 1 }}></span>
             {isUserVerified && (
                <>
                  <Stack alignItems="center">
                    <Typography variant="body2">Credits</Typography>
                    <Typography>{userVoteState.remainingCredits}/{userVoteState.creditBudget}</Typography>
                  </Stack>
                  <IconButton
                    onClick={commitVotes}
                    disabled={!userVoteState.hasUncommittedVotes}
                  >
                    <DoneAllIcon sx={{ color: userVoteState.hasUncommittedVotes ? "primary.main" : "" }}/>
                  </IconButton>
                  <Button
                    variant="contained"
                    size="small"
                    startIcon={<CreateIcon />}
                    sx={{ textTransform: "none" }}
                    onClick={() => setWriteModalOpen(true)}
                  >
                    <Typography variant="body1" component="div">
                      {" "}
                      Write{" "}
                    </Typography>
                  </Button>
                </>
             )}
            <IconButton
              size="medium"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              aria-describedby={id}
              onClick={handleMenu}
              color="inherit"
            >
              <Avatar src={avatar} />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              slotProps={{
                paper: {
                  elevation: 0,
                  sx: {
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                    mt: 1.5,
                    '& .MuiAvatar-root': {
                      width: 32,
                      height: 32,
                      ml: -0.5,
                      mr: 1,
                    },
                    '&::before': {
                      content: '""',
                      display: 'block',
                      position: 'absolute',
                      top: 0,
                      right: 14,
                      width: 10,
                      height: 10,
                      bgcolor: 'background.paper',
                      transform: 'translateY(-50%) rotate(45deg)',
                      zIndex: 0,
                    },
                  },
                },
              }}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
              {isUserVerified ? (
                <>
                  <MenuItem>
                    <ListItemIcon>
                      <Avatar
                        src={FORUMS[forumName].iconSrc}
                        variant="rounded"
                        style={{ height: "1.2rem", width: "1.2rem", margin: "0px" }}
                      />
                    </ListItemIcon>
                    Verified!
                  </MenuItem>
                                
                  <MenuItem onClick={() => navigate("/my-support")}>
                    <ListItemIcon>
                      <FavoriteBorderIcon fontSize="small" />
                    </ListItemIcon>
                    My Support
                  </MenuItem>
                </>
                ) : (
                  <MenuItem onClick={() => navigate("/verify")}>
                    <ListItemIcon>
                      <HowToRegIcon fontSize="small" />
                    </ListItemIcon>
                    Get verified
                  </MenuItem>
                )
              }
              <Divider />
              <MenuItem onClick={() => disconnect()}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Disconnect
              </MenuItem>
            </Menu>
          </Stack>
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
          setForum(forum);
          setChooseForumModalOpen(false);
        }}
      />
    </>
  );
}
