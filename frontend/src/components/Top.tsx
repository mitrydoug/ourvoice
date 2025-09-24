import {
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import React, { FC, useEffect, useState } from "react";
import { forumContractConfig } from "../contracts";
import { useReadContract } from "wagmi";
import VoteToggle from "./VoteToggle";
import { useUserVotes } from "../context/UserVoteContext";

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
  const [statements, setStatements] = useState<Statement[]>([]);

  const { data: _statements } = useReadContract({
    ...forumContractConfig,
    functionName: "getRankedStatementsPage",
    args: [0n, 10n],
  });

  useEffect(() => {
    if (_statements) {
      setStatements(_statements);
    }
  }, [_statements]);

  return (
    <>
      <Typography variant="h4" component="div" gutterBottom>
        Top Statements
      </Typography>
      {statements?.map((stmt, idx) => (
        <Card key={`stmt-${idx}`}>
          <CardContent>
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
            >
              <Typography variant="h5" component="div">
                {stmt.id + 1n} - {stmt.text}
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
