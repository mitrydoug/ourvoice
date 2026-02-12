import { FC, useMemo, useState } from "react";
import { metamaskIcon } from "../util";
import { useAccount } from "wagmi";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import EditIcon from "@mui/icons-material/Edit";
import VerifiedUserIcon from "@mui/icons-material/VerifiedUser";
import GppBadIcon from "@mui/icons-material/GppBad";
import { useUserVotes } from "../state/UserVotes";
import { useCreditAllocation } from "@/hooks/useCreditAllocation";
import useNickname from "@/hooks/useNickname";

// ── SVG Donut Chart ──────────────────────────────────────────────────────────

interface DonutSegment {
  value: number;
  color: string;
  label: string;
}

interface CreditDonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
}

const CreditDonutChart: FC<CreditDonutChartProps> = ({
  segments,
  size = 180,
  strokeWidth = 24,
}) => {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulativeOffset = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const fraction = segment.value / total;
      const dashLength = fraction * circumference;
      const gap = circumference - dashLength;
      const offset = -cumulativeOffset;
      cumulativeOffset += dashLength;

      return {
        ...segment,
        dashArray: `${dashLength} ${gap}`,
        dashOffset: offset,
      };
    });

  return (
    <Box sx={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc, i) => (
          <circle
            key={i}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.dashOffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: "stroke-dasharray 0.4s, stroke-dashoffset 0.4s",
            }}
          />
        ))}
      </svg>
      {/* Center label */}
      <Box
        sx={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          {total}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Total Credits
        </Typography>
      </Box>
    </Box>
  );
};

// ── Donut Legend ──────────────────────────────────────────────────────────────

const DonutLegend: FC<{ segments: DonutSegment[] }> = ({ segments }) => (
  <Stack spacing={1}>
    {segments.map((s) => (
      <Stack key={s.label} direction="row" spacing={1} alignItems="center">
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            bgcolor: s.color,
            flexShrink: 0,
          }}
        />
        <Typography variant="body2" color="text.secondary">
          {s.label}
        </Typography>
        <Typography variant="body2" fontWeight={600} sx={{ ml: "auto" }}>
          {s.value}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

// ── Main Profile Component ───────────────────────────────────────────────────

const UserProfile: FC = () => {
  const { address } = useAccount();
  const navigate = useNavigate();
  const theme = useTheme();
  const { isUserVerified } = useUserVotes();
  const allocation = useCreditAllocation();

  const [nickname, setNickname] = useNickname();
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(nickname);

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

  const handleSaveNickname = () => {
    setNickname(nicknameInput.trim());
    setEditingNickname(false);
  };

  const handleStartEdit = () => {
    setNicknameInput(nickname);
    setEditingNickname(true);
  };

  // Use the MUI theme palette so colors stay in sync with SupportAllocationBar
  const segments: DonutSegment[] = allocation
    ? [
        {
          value: allocation.allocated,
          color: theme.palette.primary.main,
          label: "Allocated",
        },
        {
          value: allocation.staged,
          color: theme.palette.warning.main,
          label: "Staged",
        },
        {
          value: allocation.unallocated,
          color: theme.palette.success.main,
          label: "Unallocated",
        },
      ]
    : [];

  if (!address) return <Navigate to="/" replace />;

  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box sx={{ width: "100%", maxWidth: 480, py: { xs: 2, sm: 4 } }}>
        <Stack spacing={3} alignItems="center">
          {/* Avatar */}
          <Avatar src={avatar ?? undefined} sx={{ width: 80, height: 80 }} />

          {/* Nickname */}
          {editingNickname ? (
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                value={nicknameInput}
                onChange={(e) => setNicknameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveNickname();
                  if (e.key === "Escape") setEditingNickname(false);
                }}
                placeholder="Enter a nickname"
                autoFocus
                slotProps={{ htmlInput: { maxLength: 32 } }}
              />
              <IconButton size="small" onClick={handleSaveNickname}>
                <CheckIcon fontSize="small" />
              </IconButton>
            </Stack>
          ) : (
            <Tooltip
              title="Your nickname is stored locally and is never shared or attached to your on-chain activity."
              arrow
            >
              <Stack
                direction="row"
                spacing={0.5}
                alignItems="center"
                sx={{ cursor: "pointer" }}
                onClick={handleStartEdit}
              >
                <Typography variant="h5" fontWeight={600}>
                  {nickname || "Set nickname"}
                </Typography>
                <IconButton size="small">
                  <EditIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Tooltip>
          )}

          {/* Verification status */}
          <Stack direction="row" spacing={1} alignItems="center">
            {isUserVerified ? (
              <>
                <VerifiedUserIcon color="success" />
                <Typography variant="body1">Verified</Typography>
                {/* Country flag — currently hardcoded to US */}
                <Box
                  component="img"
                  src="us.svg"
                  alt="US flag"
                  sx={{ width: 24, height: 16, ml: 0.5 }}
                />
              </>
            ) : (
              <>
                <GppBadIcon color="disabled" />
                <Typography variant="body1" color="text.secondary">
                  Not verified
                </Typography>
              </>
            )}
          </Stack>

          {/* Get verified CTA */}
          {!isUserVerified && (
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Verify your humanity with ZKPassport to participate in voting
                and statement submission.
              </Typography>
              <Button onClick={() => navigate("/verify")}>Get Verified</Button>
            </Box>
          )}

          {/* Credit allocation donut chart */}
          {allocation && allocation.total > 0 && (
            <>
              <Box
                sx={{
                  width: "100%",
                  height: "1px",
                  bgcolor: "divider",
                }}
              />
              <Typography variant="h6" fontWeight={600}>
                Credit Allocation
              </Typography>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={3}
                alignItems="center"
              >
                <CreditDonutChart segments={segments} />
                <DonutLegend segments={segments} />
              </Stack>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default UserProfile;
