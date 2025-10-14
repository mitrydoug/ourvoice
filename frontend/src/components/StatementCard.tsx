import {
  Box,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import React, { FC } from "react";
import { useUserVotes } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";

interface Statement {
  id: bigint;
  text: string;
  voteCount: bigint;
  rank: bigint;
  timestamp: bigint;
}

type StatementCardProps = {
  statement: Statement;
};

export const StatementCard: FC<StatementCardProps> = ({ statement }) => {
  const {
    state: { userVotes, committedVotes },
    dispatch,
  } = useUserVotes();

  const isTop1 = Number(statement.rank) == 0;
  const isTop10 = Number(statement.rank) < 10;

  return (
    <Card sx={{ p: 0 }}>
      <Stack direction="row" spacing={2} alignItems="stretch">
        <RankLabel rank={Number(statement.rank)+1} />
        <Stack spacing={1} sx={{ flexGrow: 1, p: 1 }}>
          <Typography variant="h6">
            {statement.text}
          </Typography>
          <Stack direction="row" alignItems="flex-end">
            <Typography color="text.secondary" sx={{ flexGrow: 1 }}>
              {statement.voteCount.toString()} votes
            </Typography>
            <VoteToggle
              userVoteCount={userVotes?.get(Number(statement.id)) || 0}
              uncommitedVote={
                (userVotes?.get(Number(statement.id)) || 0) !==
                (committedVotes?.get(Number(statement.id)) || 0)
              }
              onUserVoteChange={(n) =>
                dispatch({
                  type: "UPDATE_VOTE",
                  payload: { statementId: statement.id, newVoteCount: BigInt(n) },
                })
              }
            />
          </Stack>
        </Stack>
      </Stack>
    </Card>
  );
};

const RankLabel: FC<{ rank: number }> = ({ rank }) => {
  
  const color = rank == 1 ? "gold" : rank <= 10 ? "#a4c4e3ff" : "#d3d3d3ff";
  const hLevel = rank == 1 ? "h3" : rank <= 9 ? "h4" : "body1";
  const fullHeight = rank <= 10;

  return (
    <Stack justifyContent="center" sx={{ backgroundColor: color, px: 1, borderRadius: !fullHeight ? "0 0 5px 0": "" }}>
      <Typography variant={hLevel}>{rank}</Typography>
    </Stack>
  );
}


export default StatementCard;

/*<CardContent>
        <Stack direction="row" spacing={2} alignItems="center">
          <Box>
            <Typography variant={hLevel}>{Number(statement.rank) + 1}</Typography>
          </Box>
          <Box>
            <Typography variant="h6" component="div">
              {statement.text}
            </Typography>
          </Box>
        </Stack>
        
      </CardContent>
      <CardActions>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ width: "100%", px: 2 }}
        >
          <Typography color="text.secondary">
            {statement.voteCount.toString()} votes
          </Typography>
          <VoteToggle
            userVoteCount={userVotes?.get(Number(statement.id)) || 0}
            uncommitedVote={
              (userVotes?.get(Number(statement.id)) || 0) !==
              (committedVotes?.get(Number(statement.id)) || 0)
            }
            onUserVoteChange={(n) =>
              dispatch({
                type: "UPDATE_VOTE",
                payload: { statementId: statement.id, newVoteCount: BigInt(n) },
              })
            }
          />
        </Stack>
      </CardActions>*/