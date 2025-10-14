import React, { FC } from "react";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardSharpIcon from '@mui/icons-material/ArrowUpwardSharp';
import Stack from "@mui/material/Stack";
import { Box } from "@mui/material";

interface VoteToggleProps {
  userVoteCount: number;
  uncommitedVote: boolean;
  onUserVoteChange: (newVoteCount: number) => void;
}

const VoteToggle: FC<VoteToggleProps> = ({
  userVoteCount,
  uncommitedVote,
  onUserVoteChange,
}) => {

  const cost = userVoteCount * userVoteCount;

  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
    >
      <Stack spacing="0.1rem" direction="row" alignItems="center" sx={{
        border: "1px solid lightgray",
        borderRadius: "50vh",
        p: 0,
        backgroundColor: uncommitedVote ? "lightyellow" : "transparent",
      }}>
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userVoteCount - 1)}
          sx={{ p: 0.2 }}
        >
          <ArrowDownwardIcon />
        </IconButton>
        <Typography color="text.secondary" sx={{ position: "relative" }}>
          {userVoteCount}
        </Typography>
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userVoteCount + 1)}
          sx={{ p: 0.2 }}
        >
          <ArrowUpwardSharpIcon />
        </IconButton>
      </Stack>
      <Stack direction="row" alignItems="center" spacing={0.2}>
        <Typography color="text.secondary">
          {cost}
        </Typography>
        <VoiceCreditIcon />
      </Stack>
    </Stack>
  );
};

const VoiceCreditIcon: FC = () => {
  return (
    <Box sx={{ position: "relative", width: "1.2em", height: "1.2em" }}>
      <img src="credit-icon.svg" alt="Voice Credits" style={{ width: "100%", height: "100%" }} />
    </Box>
  );
};

export default VoteToggle;
