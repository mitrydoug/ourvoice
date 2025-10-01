import {
  Card,
  CardActions,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
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

  return (
    <Card>
      <CardContent>
        <Typography variant="h5">#{Number(statement.rank) + 1}</Typography>
        <Typography variant="h6" component="div">
          {statement.text}
        </Typography>
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
      </CardActions>
    </Card>
  );
};

export default StatementCard;
