import React, { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  keyframes,
} from "@mui/material";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import { useAccount, useDisconnect } from "wagmi";
import { useNavigate } from "react-router-dom";
import useNickname from "@/hooks/useNickname";
import { useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import { FORUMS } from "./ChooseForumModal";
import { useUserRegistration } from "@/hooks/useUserRegistration";
import { toAlpha2, toDemonym } from "../countryCodeMap";
import { metamaskIcon } from "../util";
import AnimatedCounter from "./AnimatedCounter";

const shimmer = keyframes`
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
`;

// ── Coin icon SVG ────────────────────────────────────────────────────────────
const CoinIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="12" cy="12" r="10" fill="#FBBF24" />
    <circle cx="12" cy="12" r="8" fill="#F59E0B" />
    <text
      x="12"
      y="16.5"
      textAnchor="middle"
      fontSize="12"
      fontWeight="bold"
      fill="#FFFBEB"
      fontFamily="Inter, sans-serif"
    >
      C
    </text>
  </svg>
);

const UserProfilePanel: React.FC = () => {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const [nickname] = useNickname();
  const userVotes = useUserVotes();
  const { isUserVerified } = userVotes;
  const { nationality, isRegistered } = useUserRegistration();
  const { name: forumName } = useForum();
  const forum = FORUMS[forumName];

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

  const alpha2 = nationality ? toAlpha2(nationality) : null;

  const credits = isUserVerified
    ? (userVotes.state?.staged?.credits ?? 0)
    : null;
  const hasStagedChanges = isUserVerified
    ? (userVotes.state?.hasStagedChanges ?? false)
    : false;
  const commitBusy = isUserVerified
    ? userVotes.state?.commitStatus !== undefined &&
    userVotes.state?.commitStatus !== "idle"
    : false;
  const commitChanges = isUserVerified ? userVotes.commitChanges : () => { };
  const resetChanges = isUserVerified ? userVotes.resetChanges : () => { };
  const hasEnoughCredits = isUserVerified
    ? (userVotes.state?.hasEnoughCredits ?? true)
    : true;

  const stagedStatementCount = isUserVerified
    ? (userVotes.state?.staged?.stagedStatements.length ?? 0)
    : 0;
  const stagedSupportCount = isUserVerified
    ? (userVotes.state?.staged?.supportAdjustments.size ?? 0)
    : 0;

  const isOverBudget = credits !== null && credits < 0;
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          borderRadius: 4,
          bgcolor: "action.hover",
          px: 2,
          pt: 2,
          pb: 1,
        }}
      >
        {/* Avatar + name row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Avatar src={avatar ?? undefined} sx={{ width: 36, height: 36 }} />

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {nickname}
            </Typography>

            {/* Verified status */}
            {isRegistered && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: 0.25,
                }}
              >
                {alpha2 ? (
                  <img
                    src={`/flags/${alpha2}.svg`}
                    alt={`${nationality} flag`}
                    style={{ height: "0.75rem", width: "auto", borderRadius: "2px" }}
                  />
                ) : (
                  <img
                    src="/earth.png"
                    alt="Global"
                    style={{ height: "1rem", width: "auto", borderRadius: "2px" }}
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Verified
                </Typography>
              </Box>
            )}
          </Box>
        </Box>

        {/* Credits row */}
        {isRegistered && !isUserVerified && forum?.countryCode && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center" }}>
              Only {toDemonym(forum.countryCode) ?? forum.label} citizens can participate in this Forum.
            </Typography>
          </>
        )}
        {credits !== null && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.75,
                ...(isOverBudget && {
                  bgcolor: "error.main",
                  color: "error.contrastText",
                  borderRadius: 100,
                  px: 1.5,
                  py: 0.25,
                }),
              }}
            >
              <CoinIcon size={20} />
              <AnimatedCounter
                value={credits}
                typographyProps={{
                  variant: "body1",
                  fontWeight: 700,
                  sx: {
                    fontVariantNumeric: "tabular-nums",
                    color: "inherit",
                  },
                }}
              />
              <Typography
                variant="body2"
                color={isOverBudget ? "inherit" : "text.secondary"}
              >
                Credits
              </Typography>
            </Box>

            {/* Lock It In + Reset buttons */}
            <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
              <Button
                variant="contained"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  void commitChanges();
                }}
                disabled={!hasStagedChanges || commitBusy || !hasEnoughCredits}
                sx={{
                  flex: 1,
                  borderRadius: 2,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  ...(hasStagedChanges && !commitBusy
                    ? {
                      animation: `${shimmer} 1.5s ease-in-out infinite`,
                    }
                    : {}),
                }}
              >
                Lock it in!
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setResetDialogOpen(true);
                }}
                disabled={!hasStagedChanges || commitBusy}
                sx={{
                  textTransform: "none",
                  color: "text.secondary",
                  fontWeight: 500,
                  minWidth: 0,
                  px: 1.5,
                }}
              >
                Reset
              </Button>
            </Box>
          </>
        )}

        <Divider sx={{ my: 1.5 }} />

        <Collapse in={menuOpen}>
          <List disablePadding dense>
            <ListItemButton
              onClick={() => void navigate("/profile")}
              sx={{ borderRadius: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
            <ListItemButton
              onClick={(e) => {
                e.stopPropagation();
                disconnect();
              }}
              sx={{ borderRadius: 2, color: "#e57373" }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: "inherit" }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Disconnect" />
            </ListItemButton>
          </List>
        </Collapse>

        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            cursor: "pointer",
          }}
          onClick={() => setMenuOpen((prev) => !prev)}
          role="button"
          aria-label={menuOpen ? "Collapse menu" : "Expand menu"}
        >
          {menuOpen ? (
            <KeyboardArrowUpIcon sx={{ color: "text.secondary" }} />
          ) : (
            <KeyboardArrowDownIcon sx={{ color: "text.secondary" }} />
          )}
        </Box>
      </Box>

      {/* Reset confirmation dialog */}
      <Dialog
        open={resetDialogOpen}
        onClose={() => setResetDialogOpen(false)}
      >
        <DialogTitle>Reset staged changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {stagedStatementCount > 0 && stagedSupportCount > 0
              ? `You will lose ${stagedStatementCount} staged statement${stagedStatementCount !== 1 ? "s" : ""} and ${stagedSupportCount} support adjustment${stagedSupportCount !== 1 ? "s" : ""}.`
              : stagedStatementCount > 0
                ? `You will lose ${stagedStatementCount} staged statement${stagedStatementCount !== 1 ? "s" : ""}.`
                : `You will lose ${stagedSupportCount} support adjustment${stagedSupportCount !== 1 ? "s" : ""}.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setResetDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            onClick={() => {
              resetChanges();
              setResetDialogOpen(false);
            }}
          >
            Reset
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default UserProfilePanel;
