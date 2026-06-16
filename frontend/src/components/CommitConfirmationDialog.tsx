import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { SponsoredNetworkFeeEstimate } from "@/hooks/useSponsoredContractWrite";

type CommitConfirmationDialogProps = {
  open: boolean;
  statementCount: number;
  supportAdjustmentCount: number;
  networkFee: SponsoredNetworkFeeEstimate | null;
  isNetworkFeeLoading: boolean;
  networkFeeError?: string;
  onClose: () => void;
  onConfirm: () => void;
};

const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const CommitConfirmationDialog = ({
  open,
  statementCount,
  supportAdjustmentCount,
  networkFee,
  isNetworkFeeLoading,
  networkFeeError,
  onClose,
  onConfirm,
}: CommitConfirmationDialogProps) => {
  const networkFeeValue = isNetworkFeeLoading
    ? "Checking..."
    : networkFeeError || networkFee?.label || "Not checked";
  const canConfirm =
    !isNetworkFeeLoading &&
    !networkFeeError &&
    networkFee !== null &&
    networkFee.kind !== "unavailable";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>Lock in staged changes?</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <DialogContentText>
            You are adding {pluralize(statementCount, "statement")} and{" "}
            {pluralize(supportAdjustmentCount, "support adjustment")}.
          </DialogContentText>

          <Stack spacing={1.25}>
            <Stack direction="row" justifyContent="space-between" gap={2}>
              <Typography variant="body2" color="text.secondary">
                Network fee
              </Typography>
              <Typography variant="body2" fontWeight={700} textAlign="right">
                {networkFeeValue}
              </Typography>
            </Stack>
            {networkFee?.kind === "unavailable" && networkFee.reason && (
              <Typography variant="caption" color="error">
                {networkFee.reason}
              </Typography>
            )}
            {networkFee?.kind === "self-funded" && networkFee.reason && (
              <Typography variant="caption" color="text.secondary">
                {networkFee.reason}
              </Typography>
            )}
            <Typography variant="body2" fontWeight={700}>
              No funds are being moved
            </Typography>
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} disabled={!canConfirm}>
          Lock It In
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommitConfirmationDialog;
