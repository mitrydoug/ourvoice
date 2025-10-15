import {
  Box,
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardSharpIcon from "@mui/icons-material/ArrowUpwardSharp";
import RemoveIcon from "@mui/icons-material/Remove";
import { forumContractConfig } from "../contracts";

import React, { FC } from "react";
import { useUserVotes } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";
import { useBlockNumber, useReadContract } from "wagmi";

const LOOK_BACK_BLOCKS = BigInt(1);

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

  const { data: blockNumber } = useBlockNumber();

  const result = useReadContract({
    ...forumContractConfig,
    functionName: "getStatementsById",
    args: [[statement.id]],
    blockNumber: blockNumber ? blockNumber - LOOK_BACK_BLOCKS : undefined,
    query: { enabled: !!blockNumber },
  });

  const statementOneWeekAgo = result.data
    ? (result.data[0] as Statement)
    : null;

  const rankDelta = statementOneWeekAgo
    ? Number(statementOneWeekAgo.rank) - Number(statement.rank)
    : null;

  return (
    <Card sx={{ p: 0 }}>
      <Stack direction="row" spacing={2} alignItems="stretch">
        <RankLabel rank={Number(statement.rank) + 1} />
        <Stack spacing={1} sx={{ flexGrow: 1, p: 1 }}>
          <Typography variant="h6">{statement.text}</Typography>
          <Stack direction="row" alignItems="flex-end" spacing={2}>
            <Typography color="text.secondary">
              {statement.voteCount.toString()} votes
            </Typography>
            <Stack
              direction="row"
              sx={{
                flexGrow: 1,
                color:
                  rankDelta === null
                    ? "gray"
                    : rankDelta > 0
                      ? "green"
                      : rankDelta < 0
                        ? "red"
                        : "gray",
              }}
            >
              {rankDelta === null ? (
                <RemoveIcon sx={{ strokeWidth: 2 }} />
              ) : rankDelta > 0 ? (
                <ArrowUpwardSharpIcon sx={{ strokeWidth: 2 }} />
              ) : rankDelta < 0 ? (
                <ArrowDownwardIcon sx={{ strokeWidth: 2 }} />
              ) : (
                <RemoveIcon />
              )}
              <Typography sx={{ fontWeight: "bold" }}>{rankDelta}</Typography>
            </Stack>
            {/*statementOneWeekAgo && (
              <Box display="flex" alignItems="center" sx={{ flexGrow: 1 }} color={statement.voteCount > statementOneWeekAgo.voteCount ? "green" : statement.voteCount < statementOneWeekAgo.voteCount ? "red" : "text.secondary"}>
                {statement.voteCount > statementOneWeekAgo.voteCount ? <KeyboardArrowUpIcon /> : statement.voteCount < statementOneWeekAgo.voteCount ? <KeyboardArrowDownIcon /> : <RemoveIcon />}
              </Box>
            )*/}
            <VoteToggle
              userVoteCount={userVotes?.get(Number(statement.id)) || 0}
              uncommitedVote={
                (userVotes?.get(Number(statement.id)) || 0) !==
                (committedVotes?.get(Number(statement.id)) || 0)
              }
              onUserVoteChange={(n) =>
                dispatch({
                  type: "UPDATE_VOTE",
                  payload: {
                    statementId: statement.id,
                    newVoteCount: BigInt(n),
                  },
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
    <Stack
      justifyContent="center"
      sx={{
        backgroundColor: color,
        px: 1,
        borderRadius: !fullHeight ? "0 0 5px 0" : "",
      }}
    >
      <Typography variant={hLevel}>{rank}</Typography>
    </Stack>
  );
};

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
