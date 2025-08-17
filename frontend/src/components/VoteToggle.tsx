import React, { FC } from 'react';
import { Box } from '@mui/material';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import Stack from '@mui/material/Stack';

interface VoteToggleProps {
    userVoteCount: number;
    onUserVoteChange: (newVoteCount: number) => void;
}

const VoteToggle: FC<VoteToggleProps> = ({ userVoteCount, onUserVoteChange }) => {

  return (
    <Stack spacing="0.5rem" direction="row" >
        <IconButton aria-label="delete" disabled color="primary" onClick={() => onUserVoteChange(userVoteCount - 1)}>
            <RemoveCircleOutlineIcon />
        </IconButton>
        <Stack alignItems="center">
            <Typography variant="subtitle1">{userVoteCount}</Typography>
            <Typography variant="body2" sx={{ position: "relative", top: "-10px" }}>Votes</Typography>
        </Stack>
        <IconButton aria-label="delete" disabled color="primary" onClick={() => onUserVoteChange(userVoteCount + 1)}>
            <AddCircleOutlineIcon />
        </IconButton>
    </Stack>
  );
}

export default VoteToggle;