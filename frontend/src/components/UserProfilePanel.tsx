import React, { useEffect, useState } from "react";
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
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Skeleton,
  Typography,
  keyframes,
} from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";
import CreateIcon from "@mui/icons-material/Create";
import { useNavigate } from "react-router-dom";
import { useForumNavigate } from "@/hooks/useForumNavigate";
import { useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import { FORUMS } from "./ChooseForumModal";
import { useUserRegistration } from "@/hooks/useUserRegistration";
import { toAlpha2, toDemonym } from "../countryCodeMap";
import useUserIdentity from "@/hooks/useUserIdentity";
import { useCreditConversion } from "../hooks/useCreditConversion";
import AnimatedCounter from "./AnimatedCounter";
import IndeterminateCheckBoxIcon from "@mui/icons-material/IndeterminateCheckBox";
import { useWalletAuth } from "@/wallet";
import CommitConfirmationDialog from "./CommitConfirmationDialog";
import type { CommitPreview } from "../state/UserVotes";

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
  const { disconnect } = useWalletAuth();
  const navigate = useForumNavigate();
  const rawNavigate = useNavigate();
  const { displayName, avatar } = useUserIdentity();
  const userVotes = useUserVotes();
  const { isUserVerified, isVerifiedLoading } = userVotes;
  const {
    nationality,
    isRegistered,
    isLoading: isRegistrationLoading,
  } = useUserRegistration();
  const { name: forumName } = useForum();
  const { toCredits } = useCreditConversion();
  const forum = FORUMS[forumName];

  const isStatusLoading = isVerifiedLoading || isRegistrationLoading;

  const alpha2 = nationality ? toAlpha2(nationality) : null;

  const credits = isUserVerified
    ? toCredits(userVotes.state?.staged?.credits ?? 0)
    : null;
  const hasStagedChanges = isUserVerified
    ? (userVotes.state?.hasStagedChanges ?? false)
    : false;
  const commitBusy = isUserVerified
    ? userVotes.state?.commitStatus !== undefined &&
    userVotes.state?.commitStatus !== "idle"
    : false;
  const commitChanges = isUserVerified ? userVotes.commitChanges : () => { };
  const previewCommitChanges = isUserVerified
    ? userVotes.previewCommitChanges
    : undefined;
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
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [commitPreview, setCommitPreview] = useState<CommitPreview | null>(
    null,
  );
  const [commitPreviewLoading, setCommitPreviewLoading] = useState(false);
  const [commitPreviewError, setCommitPreviewError] = useState<string>();
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const showGetVerified = !isRegistered;
  const showCitizenNote = Boolean(
    isRegistered && !isUserVerified && forum?.countryCode,
  );
  const showCredits = credits !== null;
  const hasActionPanel = showGetVerified || showCitizenNote || showCredits;

  useEffect(() => {
    if (!commitDialogOpen || !previewCommitChanges) return;

    let isCancelled = false;
    setCommitPreview(null);
    setCommitPreviewError(undefined);
    setCommitPreviewLoading(true);

    void previewCommitChanges()
      .then((preview) => {
        if (isCancelled) return;
        if (preview) {
          setCommitPreview(preview);
        } else {
          setCommitPreviewError("No staged changes are ready to commit.");
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setCommitPreviewError(
          error instanceof Error
            ? error.message
            : "Unable to check the network fee.",
        );
      })
      .finally(() => {
        if (!isCancelled) setCommitPreviewLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [commitDialogOpen, previewCommitChanges]);

  if (isStatusLoading) {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            bgcolor: "action.hover",
            borderRadius: 999,
            pl: 1,
            pr: 1.5,
            py: 1,
          }}
        >
          <Skeleton variant="circular" width={36} height={36} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width="70%" height={24} />
            <Skeleton variant="text" width="50%" height={18} />
          </Box>
        </Box>
        <Box
          sx={{
            borderRadius: 4,
            bgcolor: "action.hover",
            p: 2,
            mt: 1.5,
          }}
        >
          <Skeleton variant="rounded" width="100%" height={36} />
        </Box>
      </>
    );
  }

  return (
    <>
      {/* Account chip + menu — one connected surface */}
      <Box
        sx={{
          bgcolor: "action.hover",
          borderTopLeftRadius: "30px",
          borderTopRightRadius: "30px",
          borderBottomLeftRadius: menuOpen ? "16px" : "30px",
          borderBottomRightRadius: menuOpen ? "16px" : "30px",
          overflow: "hidden",
          transition: (theme) =>
            theme.transitions.create("border-radius", {
              duration: theme.transitions.duration.shortest,
            }),
        }}
      >
        {/* header row — toggles the account menu */}
        <Box
          onClick={() => setMenuOpen((prev) => !prev)}
          role="button"
          aria-label={menuOpen ? "Collapse account menu" : "Open account menu"}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            pl: 1,
            pr: 1.5,
            py: 0.5,
            cursor: "pointer",
            bgcolor: menuOpen ? "action.selected" : "transparent",
            "&:hover": { bgcolor: "action.selected" },
            borderBottomLeftRadius: "30px",
            borderBottomRightRadius: "30px",
          }}
        >
          <Avatar src={avatar ?? undefined} sx={{ width: 36, height: 36 }} />

          <Box sx={{ minWidth: 0, flex: 1, ml: 0.5 }}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>
              {displayName}
            </Typography>

            {/* Verified / Not Verified status */}
            {isStatusLoading && (
              <Skeleton variant="text" width={80} height={18} />
            )}
            {!isStatusLoading && !isRegistered && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                }}
              >
                <IndeterminateCheckBoxIcon
                  sx={{ fontSize: 16, color: "text.disabled" }}
                />
                <Typography variant="body2" color="text.secondary">
                  Not verified
                </Typography>
              </Box>
            )}
            {!isStatusLoading && isRegistered && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  ml: 0.5,
                }}
              >
                {alpha2 ? (
                  <img
                    src={`./flags/${alpha2}.svg`}
                    alt={`${nationality} flag`}
                    style={{
                      height: "0.75rem",
                      width: "auto",
                      borderRadius: "2px",
                    }}
                  />
                ) : (
                  <img
                    src="./earth.png"
                    alt="Earth"
                    style={{
                      height: "1rem",
                      width: "auto",
                      borderRadius: "2px",
                    }}
                  />
                )}
                <Typography variant="body2" color="text.secondary">
                  Verified
                </Typography>
              </Box>
            )}
          </Box>

          {menuOpen ? (
            <KeyboardArrowUpIcon
              sx={{ color: "text.secondary", flexShrink: 0 }}
            />
          ) : (
            <KeyboardArrowDownIcon
              sx={{ color: "text.secondary", flexShrink: 0 }}
            />
          )}
        </Box>

        {/* menu folds out underneath, sharing the chip surface */}
        <Collapse in={menuOpen}>
          <List disablePadding sx={{ px: 0.5, pb: 0.5, pt: 0.5 }}>
            <ListItemButton
              dense
              onClick={() => void navigate("/profile")}
              sx={{
                borderRadius: 2,
                py: 0.5,
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <PersonIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Profile"
                slotProps={{ primary: { variant: "body2" } }}
              />
            </ListItemButton>
            <ListItemButton
              dense
              onClick={() => void navigate("/settings")}
              sx={{
                borderRadius: 2,
                py: 0.5,
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32 }}>
                <SettingsIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Settings"
                slotProps={{ primary: { variant: "body2" } }}
              />
            </ListItemButton>
            <ListItemButton
              dense
              onClick={() => disconnect()}
              sx={{
                borderRadius: 2,
                py: 0.5,
                color: "#e57373",
                "&:hover": { bgcolor: "action.selected" },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
                <LogoutIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Disconnect"
                slotProps={{ primary: { variant: "body2" } }}
              />
            </ListItemButton>
          </List>
        </Collapse>
      </Box>

      {/* Actions panel — credits + verification actions */}
      {hasActionPanel && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            borderRadius: 4,
            bgcolor: "action.hover",
            p: 2,
            mt: 1.5,
          }}
        >
          {showGetVerified && (
            <Button
              variant="contained"
              fullWidth
              onClick={() => void rawNavigate("/verify")}
              sx={{
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              Get Verified
            </Button>
          )}
          {isRegistered && !isUserVerified && forum?.countryCode && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center" }}
            >
              Only {toDemonym(forum.countryCode) ?? forum.label} citizens can
              participate in this Forum.
            </Typography>
          )}
          {showCredits && (
            <>
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
                    setCommitDialogOpen(true);
                  }}
                  disabled={
                    !hasStagedChanges || commitBusy || !hasEnoughCredits
                  }
                  sx={{
                    flex: 2,
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
                  variant="contained"
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResetDialogOpen(true);
                  }}
                  disabled={!hasStagedChanges || commitBusy}
                  sx={{
                    flex: 1,
                    borderRadius: 2,
                    fontWeight: 700,
                    textTransform: "none",
                    backgroundColor: "grey.400",
                    color: "white",
                    "&:hover": {
                      backgroundColor: "grey.500",
                    },
                  }}
                >
                  Reset
                </Button>
              </Box>
              <Button
                variant="contained"
                fullWidth
                size="small"
                startIcon={<CreateIcon />}
                onClick={() => void navigate("/write")}
                sx={{
                  borderRadius: 2,
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  mt: 1,
                  textTransform: "uppercase",
                }}
              >
                Write
              </Button>
            </>
          )}
        </Box>
      )}

      <CommitConfirmationDialog
        open={commitDialogOpen}
        statementCount={stagedStatementCount}
        supportAdjustmentCount={stagedSupportCount}
        networkFee={commitPreview?.networkFee ?? null}
        isNetworkFeeLoading={commitPreviewLoading}
        networkFeeError={commitPreviewError}
        onClose={() => setCommitDialogOpen(false)}
        onConfirm={() => {
          setCommitDialogOpen(false);
          void commitChanges({
            showWalletUIs: commitPreview?.networkFee.kind === "self-funded",
          });
        }}
      />

      {/* Reset confirmation dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
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
