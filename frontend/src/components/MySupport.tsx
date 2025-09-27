import { Card, CardContent, Stack, Typography } from "@mui/material";
import React, { FC } from "react";
import { useReadContract } from "wagmi";
import { forumContractConfig } from "../contracts";
import { useUserVotes } from "../state/UserVotes";
import VoteToggle from "./VoteToggle";

interface Statement {
  id: bigint;
  text: string;
  voteCount: bigint;
  rank: bigint;
  timestamp: bigint;
}

const MySupport: FC = () => {
  const {
    state: { userVotes },
    dispatch,
  } = useUserVotes();

  console.log("User votes map: ", userVotes);

  const statementIds = userVotes
    ? Array.from(userVotes.entries())
        .sort((e1, e2) => e2[1] - e1[1])
        .map((e) => BigInt(e[0]))
    : [];

  console.log("Fetching statements for IDs: ", statementIds);

  const result = useReadContract({
    ...forumContractConfig,
    functionName: "getStatementsById",
    args: [statementIds],
  });

  const myStatements = result.data as Statement[] | undefined;

  console.log("My supported statements: ", myStatements);

  return (
    <>
      {myStatements?.map((stmt, idx) => (
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

export default MySupport;
