import React, { FC } from "react";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardSharpIcon from "@mui/icons-material/ArrowUpwardSharp";
import Stack from "@mui/material/Stack";

interface VoteToggleProps {
  userSupport: number;
  uncommitedSupport: boolean;
  onUserVoteChange: (newVoteCount: number) => void;
}

const VoteToggle: FC<VoteToggleProps> = ({
  userSupport,
  uncommitedSupport,
  onUserVoteChange,
}) => {

  return (
    <Stack direction="row" alignItems="center" spacing={1}>
      <Stack
        spacing="0.1rem"
        direction="row"
        alignItems="center"
        sx={{
          border: "1px solid lightgray",
          borderRadius: "50vh",
          p: 0,
          backgroundColor: uncommitedSupport ? "lightyellow" : "transparent",
        }}
      >
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userSupport - 1)}
          sx={{ p: 0.2 }}
        >
          <ArrowDownwardIcon />
        </IconButton>
        <Typography color="text.secondary" sx={{ position: "relative" }}>
          {userSupport}
        </Typography>
        <IconButton
          color="primary"
          onClick={() => onUserVoteChange(userSupport + 1)}
          sx={{ p: 0.2 }}
        >
          <ArrowUpwardSharpIcon />
        </IconButton>
      </Stack>
    </Stack>
  );
};

export default VoteToggle;
