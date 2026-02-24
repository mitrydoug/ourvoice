import React, { useMemo } from "react";
import { Avatar, Box, IconButton, Typography, keyframes } from "@mui/material";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import { useAccount } from "wagmi";
import useNickname from "@/hooks/useNickname";
import { useUserVotes } from "../state/UserVotes";
import { metamaskIcon } from "../util";

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

export interface UserProfilePillProps {
  onOpenMenu: (event: React.MouseEvent<HTMLElement>) => void;
}

const UserProfilePill: React.FC<UserProfilePillProps> = ({ onOpenMenu }) => {
  const { address } = useAccount();
  const [nickname] = useNickname();
  const userVotes = useUserVotes();
  const { isUserVerified } = userVotes;

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

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
  const commitSupport = isUserVerified ? userVotes.commitSupport : () => { };

  const showCommit = credits !== null;

  /** Format credits with locale-aware thousands separators */
  const formattedCredits = credits !== null ? credits.toLocaleString() : null;

  return (
    <Box
      onClick={onOpenMenu}
      sx={{
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        borderRadius: 4,
        bgcolor: "action.hover",
        px: 1.5,
        py: 1.25,
        transition: "background-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          bgcolor: "action.selected",
          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        },
      }}
    >
      {/* Top row: avatar, name, commit */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Avatar src={avatar ?? undefined} sx={{ width: 36, height: 36 }} />

        <Typography
          variant="body1"
          fontWeight={600}
          noWrap
          sx={{ flex: 1, minWidth: 0 }}
        >
          {nickname}
        </Typography>

        {/* Commit button */}
        {showCommit && (
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              void commitSupport();
            }}
            disabled={!hasStagedChanges || commitBusy}
            sx={{
              ...(hasStagedChanges && !commitBusy
                ? {
                  animation: `${shimmer} 1.5s ease-in-out infinite`,
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": { bgcolor: "primary.dark" },
                }
                : {}),
            }}
          >
            <DoneAllIcon fontSize="small" />
          </IconButton>
        )}
      </Box>

      {/* Credits row */}
      {formattedCredits !== null && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mt: 0.5,
            ml: "25px",
          }}
        >
          <CoinIcon size={18} />
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{
              fontVariantNumeric: "tabular-nums",
              color: "text.primary",
            }}
          >
            {formattedCredits}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            credits
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default UserProfilePill;
