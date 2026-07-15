import {
  Box,
  Button,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import type { SponsoredNetworkFeeEstimate } from "@/wallet";

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
      <DialogTitle sx={{ pb: 1.25 }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <SaveOutlinedIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
              Save your changes?
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            Details
          </Typography>
          <Box
            sx={{
              borderRadius: 2.5,
              px: 2,
              py: 1.5,
              bgcolor: "action.hover",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Stack spacing={1.25}>
              <Stack spacing={1} divider={<Divider flexItem />}>
                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    Statements added
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    textAlign="right"
                  >
                    {statementCount}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    Support changes
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    textAlign="right"
                  >
                    {supportAdjustmentCount}
                  </Typography>
                </Stack>

                <Stack direction="row" justifyContent="space-between" gap={2}>
                  <Typography variant="body2" color="text.secondary">
                    Network fee
                  </Typography>
                  <Typography
                    variant="body2"
                    fontWeight={700}
                    textAlign="right"
                  >
                    {networkFeeValue}
                  </Typography>
                </Stack>
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
            </Stack>
          </Box>

          <Typography variant="caption" color="text.secondary">
            No funds are being moved. Wallet confirmation may be required
            depending on how the network fee is handled.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={onConfirm}
          disabled={!canConfirm}
          sx={{ textTransform: "none", fontWeight: 700 }}
        >
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CommitConfirmationDialog;
