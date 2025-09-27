import { Card, CardContent, Stack, Typography } from "@mui/material";
import React, { FC } from "react";
import { forumContractConfig } from "../contracts";
import { useReadContract } from "wagmi";
import VoteToggle from "./VoteToggle";
import { useUserVotes } from "../state/UserVotes";

const PAGE_SIZE = 25;

interface Statement {
  id: bigint;
  text: string;
  voteCount: bigint;
  rank: bigint;
  timestamp: bigint;
}

const Ranking: FC = () => {
  const {
    state: { userVotes },
    dispatch,
  } = useUserVotes();

  const result = useReadContract({
    ...forumContractConfig,
    functionName: "getRankedStatementsPage",
    args: [0n, BigInt(PAGE_SIZE)],
  });

  const statementsPage = result.data as Statement[] | undefined;

  console.log("Top statements: ", statementsPage);

  return (
    <>
      {statementsPage?.map((stmt, idx) => (
        <Card key={`stmt-${idx}`}>
          <CardContent>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" component="div">
                {stmt.rank + 1n} - {stmt.text}
              </Typography>
              <Typography variant="h5" component="div">
                {stmt.voteCount}
              </Typography>
              <VoteToggle
                userVoteCount={userVotes?.get(Number(stmt.id)) || 0}
                onUserVoteChange={(n) =>
                  dispatch({
                    type: "UPDATE_VOTE",
                    payload: { statementId: stmt.id, newVoteCount: BigInt(n) },
                  })
                }
              />
            </Stack>
          </CardContent>
        </Card>
      ))}
    </>
  );
};

export default Ranking;
