import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Skeleton,
  Tooltip,
  Typography,
  keyframes,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import ClearRoundedIcon from "@mui/icons-material/ClearRounded";
import { useNavigate } from "react-router-dom";
import { useUserVotes } from "../state/UserVotes";
import { useForum } from "../state/Forum";
import { FORUMS } from "./ChooseForumModal";
import { useUserRegistration } from "@/hooks/useUserRegistration";
import { toDemonym } from "../countryCodeMap";
import { useCreditConversion } from "../hooks/useCreditConversion";
import AnimatedCounter from "./AnimatedCounter";
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

const CreditActionPanel: React.FC = () => {
  const { address } = useWalletAuth();
  const rawNavigate = useNavigate();
  const userVotes = useUserVotes();
  const { isUserVerified, isVerifiedLoading } = userVotes;
  const { isRegistered, isLoading: isRegistrationLoading } =
    useUserRegistration();
  const { name: forumName } = useForum();
  const { toCredits } = useCreditConversion();
  const forum = FORUMS[forumName];

  const isStatusLoading = isVerifiedLoading || isRegistrationLoading;

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

  const showGetVerified = !isRegistered;
  const showCitizenNote = Boolean(
    isRegistered && !isUserVerified && forum?.countryCode,
  );
  const showCredits = credits !== null;
  const hasActionPanel = showGetVerified || showCitizenNote || showCredits;
  const pendingCount = stagedStatementCount + stagedSupportCount;

  // Capture the latest preview function in a ref so the effect below runs
  // exactly once per dialog open, instead of re-firing every time the callback
  // identity churns (e.g. Privy handing back a fresh smart-wallet client on its
  // own re-render cadence). Staged changes can't change while the modal is
  // open, so a single preview is correct.
  const previewCommitChangesRef = useRef(previewCommitChanges);
  previewCommitChangesRef.current = previewCommitChanges;

  useEffect(() => {
    if (!commitDialogOpen) return;
    const runPreview = previewCommitChangesRef.current;
    if (!runPreview) return;

    let isCancelled = false;
    setCommitPreview(null);
    setCommitPreviewError(undefined);
    setCommitPreviewLoading(true);

    void runPreview()
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
        // Show a friendly message; the raw error (often serialized JSON from
        // viem/Alchemy) is logged for debugging rather than shown to the user.
        console.error("Failed to preview commit network fee", error);
        setCommitPreviewError("Unable to check the network fee.");
      })
      .finally(() => {
        if (!isCancelled) setCommitPreviewLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [commitDialogOpen]);

  if (!address) return null;

  if (isStatusLoading) {
    return (
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
    );
  }

  if (!hasActionPanel) return null;

  return (
    <>
      {/* Actions panel — credits + verification actions */}
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
            {/* Info row — credits headline + status, constant height */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  minWidth: 0,
                }}
              >
                <CoinIcon size={18} />
                <AnimatedCounter
                  value={credits}
                  typographyProps={{
                    variant: "body1",
                    fontWeight: 700,
                    sx: {
                      fontVariantNumeric: "tabular-nums",
                      lineHeight: 1,
                      color: isOverBudget ? "error.main" : "text.primary",
                    },
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  credits
                </Typography>
              </Box>

              {commitBusy || hasStagedChanges ? (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    flexShrink: 0,
                  }}
                >
                  <Tooltip
                    title={
                      !hasEnoughCredits
                        ? "Not enough credits"
                        : "Submit changes"
                    }
                  >
                    <span>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCommitDialogOpen(true);
                        }}
                        disabled={commitBusy || !hasEnoughCredits}
                        sx={{
                          minWidth: 0,
                          borderRadius: 2,
                          px: 1.25,
                          py: 0.25,
                          gap: 0.5,
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          ...(hasStagedChanges && !commitBusy
                            ? {
                              animation: `${shimmer} 1.5s ease-in-out infinite`,
                            }
                            : {}),
                        }}
                      >
                        {commitBusy ? (
                          <CircularProgress size={16} color="inherit" />
                        ) : (
                          <>
                            {pendingCount}
                            <SendRoundedIcon sx={{ fontSize: 16 }} />
                          </>
                        )}
                      </Button>
                    </span>
                  </Tooltip>
                  {!commitBusy && (
                    <Tooltip title="Discard changes">
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          setResetDialogOpen(true);
                        }}
                        sx={{ color: "text.secondary" }}
                      >
                        <ClearRoundedIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              ) : (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    color: "success.main",
                    flexShrink: 0,
                  }}
                >
                  <CheckCircleRoundedIcon sx={{ fontSize: 16 }} />
                  <Typography variant="caption" fontWeight={600}>
                    Synced
                  </Typography>
                </Box>
              )}
            </Box>
          </>
        )}
      </Box>

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
            selfFunded: commitPreview?.networkFee.kind === "self-funded",
          });
        }}
      />

      {/* Discard confirmation dialog */}
      <Dialog open={resetDialogOpen} onClose={() => setResetDialogOpen(false)}>
        <DialogTitle>Discard staged changes?</DialogTitle>
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
            Discard
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default CreditActionPanel;
