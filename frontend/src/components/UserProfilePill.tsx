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
import { useConnection } from "wagmi";
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
  const { address } = useConnection();
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
        gap: 1,
        cursor: "pointer",
        borderRadius: 100,
        border: "1px solid",
        borderColor: "divider",
        pl: "8px",
        pr: "8px",
        py: 0.5,
        transition: "background-color 0.15s",
        "&:hover": {
          bgcolor: "action.hover",
        },
      }}
    >
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

      <Stack spacing={0} alignItems="flex-end" sx={{ minWidth: 0 }}>
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
      <Avatar src={avatar ?? undefined} sx={{ width: 32, height: 32 }} />
    </Box>
  );
};

export default UserProfilePill;
