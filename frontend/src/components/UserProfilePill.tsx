import React, { useMemo } from "react";
import {
  Avatar,
  Box,
  IconButton,
  Stack,
  Typography,
  keyframes,
} from "@mui/material";
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
  const commitSupport = isUserVerified ? userVotes.commitSupport : () => {};

  const showCommit = credits !== null;

  return (
    <Box
      onClick={onOpenMenu}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        cursor: "pointer",
        borderRadius: 100,
        bgcolor: "action.hover",
        px: 1.5,
        py: 1,
        transition: "background-color 0.2s, box-shadow 0.2s",
        "&:hover": {
          bgcolor: "action.selected",
          boxShadow: "0 1px 4px rgba(0,0,0,0.10)",
        },
      }}
    >
      {/* Avatar on the left */}
      <Avatar src={avatar ?? undefined} sx={{ width: 36, height: 36 }} />

      <Stack spacing={0} alignItems="flex-start" sx={{ minWidth: 0, flex: 1 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {nickname}
        </Typography>
        {showCommit && (
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ fontVariantNumeric: "tabular-nums" }}
          >
            Credits: {credits}
          </Typography>
        )}
      </Stack>

      {/* Commit button on the right */}
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
  );
};

export default UserProfilePill;
