import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  Button,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  Typography,
} from "@mui/material";
import { useUserVotes } from "../state/UserVotes";
import Logout from "@mui/icons-material/Logout";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import HowToRegIcon from "@mui/icons-material/HowToReg";
import SettingsIcon from "@mui/icons-material/Settings";
import GitHubIcon from "@mui/icons-material/GitHub";

// Helper function to calculate credit cost for a given support level
const creditCost = (support: number): number => {
  return (support * (support + 1)) / 2;
};

// Component to display the support allocation progress bar
const SupportAllocationBar: React.FC = () => {
  const userVotes = useUserVotes();

  const { blueSegment, yellowSegment, greenSegment, total } = useMemo(() => {
    if (!userVotes.isUserVerified || !userVotes.state.onChain || !userVotes.state.staged) {
      return { blueSegment: 0, yellowSegment: 0, greenSegment: 0, total: 0 };
    }

    const { onChain, staged } = userVotes.state;

    // Get all statement IDs that have either onChain or staged support
    const allStatementIds = new Set([
      ...onChain.statementSupport.keys(),
      ...staged.statementSupport.keys(),
    ]);

    let totalOnChainCost = 0;
    let totalDecreaseCost = 0;
    let totalIncreaseCost = 0;

    for (const statementId of allStatementIds) {
      const onChainSupport = onChain.statementSupport.get(statementId) || 0;
      const stagedSupport = staged.statementSupport.get(statementId) || 0;

      const onChainCost = creditCost(onChainSupport);
      const stagedCost = creditCost(stagedSupport);

      totalOnChainCost += onChainCost;

      if (stagedSupport < onChainSupport) {
        // Decrease
        totalDecreaseCost += onChainCost - stagedCost;
      } else if (stagedSupport > onChainSupport) {
        // Increase
        totalIncreaseCost += stagedCost - onChainCost;
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
    <Box sx={{ width: "100%", mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          height: 8,
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "grey.200",
        }}
      >
        {bluePercent > 0 && (
          <Box
            sx={{
              width: `${bluePercent}%`,
              backgroundColor: "primary.main",
            }}
          />
        )}
        {yellowPercent > 0 && (
          <Box
            sx={{
              width: `${yellowPercent}%`,
              backgroundColor: "warning.main",
            }}
          />
        )}
        {greenPercent > 0 && (
          <Box
            sx={{
              width: `${greenPercent}%`,
              backgroundColor: "success.main",
            }}
          />
        )}
      </Box>
    </Box>
  );
};

export interface AccountMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  isUserVerified: boolean;
  navigate: (path: string) => void;
  disconnect: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  anchorEl,
  open,
  onClose,
  isUserVerified,
  navigate,
  disconnect,
}) => (
  <Menu
    anchorEl={anchorEl}
    id="account-menu"
    open={open}
    onClose={onClose}
    onClick={onClose}
    slotProps={{
      paper: {
        elevation: 0,
        sx: {
          overflow: "visible",
          filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
          mt: 1.5,
          "& .MuiAvatar-root": {
            width: 32,
            height: 32,
            ml: -0.5,
            mr: 1,
          },
          "&::before": {
            content: '""',
            display: "block",
            position: "absolute",
            top: 0,
            right: 14,
            width: 10,
            height: 10,
            bgcolor: "background.paper",
            transform: "translateY(-50%) rotate(45deg)",
            zIndex: 0,
          },
        },
      },
    }}
    transformOrigin={{ horizontal: "right", vertical: "top" }}
    anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
  >
    {isUserVerified ? (
      <>
        <MenuItem onClick={() => navigate("/account")}>
          <ListItemIcon>
            <PersonOutlineOutlinedIcon />
          </ListItemIcon>
          Account
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
    )}
    <Divider />
    <MenuItem onClick={() => disconnect()}>
      <ListItemIcon>
        <Logout fontSize="small" />
      </ListItemIcon>
      Disconnect
    </MenuItem>
  </Menu>
);

export interface AccountDrawerProps {
  open: boolean;
  onClose: () => void;
  isUserVerified: boolean;
  navigate: (path: string) => void;
  disconnect: () => void;
  username?: string;
  avatar?: string | null;
  commitSupport: () => void;
  hasStagedChanges: boolean;
}

export const AccountDrawer: React.FC<AccountDrawerProps> = ({
  open,
  onClose,
  isUserVerified,
  navigate,
  disconnect,
  username,
  avatar,
  commitSupport,
  hasStagedChanges,
}) => {
  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleCommit = () => {
    commitSupport();
    onClose();
  };

  const handleDisconnect = () => {
    disconnect();
    onClose();
  };

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: "80%",
          maxWidth: 320,
        },
      }}
    >
      <Box sx={{ p: 2 }}>
        {/* Header with avatar, username, and settings */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 2 }}
        >
          <Stack direction="row" alignItems="center" spacing={1.5}>
            <Avatar src={avatar ?? undefined} sx={{ width: 40, height: 40 }} />
            <Typography variant="h6" fontWeight="medium">
              {username || "User"}
            </Typography>
          </Stack>
          <IconButton onClick={() => handleNavigate("/settings")}>
            <SettingsIcon />
          </IconButton>
        </Stack>

        {/* Support allocation progress bar */}
        {isUserVerified && <SupportAllocationBar />}

        {/* Lock it In button */}
        {isUserVerified && (
          <Button
            variant="outlined"
            fullWidth
            onClick={handleCommit}
            disabled={!hasStagedChanges}
            sx={{
              mb: 2,
              borderColor: hasStagedChanges ? "warning.main" : "grey.300",
              color: hasStagedChanges ? "warning.main" : "grey.500",
              "&:hover": {
                borderColor: hasStagedChanges ? "warning.dark" : "grey.400",
                backgroundColor: hasStagedChanges
                  ? "rgba(237, 108, 2, 0.04)"
                  : undefined,
              },
            }}
          >
            Lock it In!
          </Button>
        )}

        {/* Navigation list */}
        <List disablePadding>
          {isUserVerified ? (
            <>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate("/account")}>
                  <ListItemText
                    primary="Profile"
                    primaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate("/my-support")}>
                  <ListItemText
                    primary="Your Support"
                    primaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton
                  onClick={() => handleNavigate("/my-statements")}
                >
                  <ListItemText
                    primary="Your Statements"
                    primaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding>
                <ListItemButton onClick={() => handleNavigate("/saved")}>
                  <ListItemText
                    primary="Saved"
                    primaryTypographyProps={{
                      variant: "body1",
                      fontWeight: 500,
                    }}
                  />
                </ListItemButton>
              </ListItem>
            </>
          ) : (
            <ListItem disablePadding>
              <ListItemButton onClick={() => handleNavigate("/verify")}>
                <ListItemIcon>
                  <HowToRegIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Get verified"
                  primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
                />
              </ListItemButton>
            </ListItem>
          )}
        </List>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1, minHeight: 48 }} />

        {/* How it works */}
        <List disablePadding sx={{ mt: 4 }}>
          <ListItem disablePadding>
            <ListItemButton onClick={() => handleNavigate("/how-it-works")}>
              <ListItemText
                primary="How it works"
                primaryTypographyProps={{ variant: "body1", fontWeight: 500 }}
              />
            </ListItemButton>
          </ListItem>
        </List>

        {/* Logout button */}
        <Button
          variant="outlined"
          fullWidth
          onClick={handleDisconnect}
          sx={{
            mt: 2,
            mb: 2,
            borderColor: "error.light",
            color: "error.main",
            "&:hover": {
              borderColor: "error.main",
              backgroundColor: "rgba(211, 47, 47, 0.04)",
            },
          }}
        >
          Logout
        </Button>

        {/* Social icons */}
        <Stack direction="row" spacing={2} justifyContent="center">
          <IconButton
            component="a"
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <GitHubIcon />
          </IconButton>
          <IconButton
            component="a"
            href="https://discord.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Box
              component="img"
              src="discord-round-black-icon.png"
              alt="Discord"
              sx={{ width: 24, height: 24 }}
            />
          </IconButton>
        </Stack>
      </Box>
    </Drawer>
  );
};
