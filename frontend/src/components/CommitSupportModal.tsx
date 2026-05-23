import { FC, useEffect, useRef } from "react";
import { Box, CircularProgress, Modal, Stack, Typography } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { type CommitStatus } from "../state/UserVotes";

interface CommitSupportModalProps {
  commitStatus: CommitStatus;
  onReset: () => void;
}

const modalBoxSx = {
  position: "absolute" as const,
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  minWidth: 280,
  textAlign: "center",
  outline: "none",
};

const CommitSupportModal: FC<CommitSupportModalProps> = ({
  commitStatus,
  onReset,
}) => {
  const autoCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-close on "confirmed" after a brief delay
  useEffect(() => {
    if (commitStatus === "confirmed") {
      autoCloseTimer.current = setTimeout(() => {
        onReset();
      }, 1200);
    }
    return () => {
      if (autoCloseTimer.current) {
        clearTimeout(autoCloseTimer.current);
        autoCloseTimer.current = null;
      }
    };
  }, [commitStatus, onReset]);

  const isOpen = commitStatus !== "idle";

  // Only allow closing by clicking away for terminal states
  const handleClose = () => {
    if (
      commitStatus === "cancelled" ||
      commitStatus === "error" ||
      commitStatus === "confirmed" ||
      commitStatus === "error"
    ) {
      onReset();
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box sx={modalBoxSx}>
        {commitStatus === "awaiting-approval" && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress size="3rem" />
            <Typography variant="body1">Awaiting user approval</Typography>
          </Stack>
        )}

        {commitStatus === "pending-confirmation" && (
          <Stack spacing={2} alignItems="center">
            <CircularProgress size="3rem" />
            <Typography variant="body1">Submitting</Typography>
          </Stack>
        )}

        {commitStatus === "confirmed" && (
          <Stack spacing={2} alignItems="center">
            <CheckCircleOutlineIcon
              sx={{ fontSize: "3rem", color: "success.main" }}
            />
            <Typography variant="body1">Done</Typography>
          </Stack>
        )}

        {commitStatus === "cancelled" && (
          <Stack spacing={2} alignItems="center">
            <CancelOutlinedIcon
              sx={{ fontSize: "3rem", color: "error.main" }}
            />
            <Typography variant="body1">Cancelled</Typography>
          </Stack>
        )}

        {commitStatus === "error" && (
          <Stack spacing={2} alignItems="center">
            <ErrorOutlineIcon
              sx={{ fontSize: "3rem", color: "warning.main" }}
            />
            <Typography variant="body1">Something went wrong</Typography>
          </Stack>
        )}
      </Box>
    </Modal>
  );
};

export default CommitSupportModal;
