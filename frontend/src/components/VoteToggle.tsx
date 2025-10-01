import React, { FC } from "react";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";
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
  return (
    <Box
      sx={{
        border: "1px solid lightgray",
        borderRadius: "50vh",
        p: 0,
        backgroundColor: uncommitedVote ? "lightyellow" : "transparent",
      }}
    >
      <Stack spacing="0.1rem" direction="row" alignItems="center">
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userVoteCount - 1)}
          sx={{ p: 0.2 }}
        >
          <RemoveIcon />
        </IconButton>
        <Typography color="text.secondary" sx={{ position: "relative" }}>
          {userVoteCount}
        </Typography>
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userVoteCount + 1)}
          sx={{ p: 0.2 }}
        >
          <AddIcon />
        </IconButton>
      </Stack>
    </Box>
  );
};

export default VoteToggle;
