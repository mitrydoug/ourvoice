import React, { FC } from "react";
import { FORUMS, FORUM_ABI } from "../contracts";
import { useReadContract } from "wagmi";
import StatementCard from "./StatementCard";
import { useForum } from "../state/Forum";

const PAGE_SIZE = 25;

interface Statement {
  id: bigint;
  text: string;
  voteCount: bigint;
  rank: bigint;
  timestamp: bigint;
}

const Top: FC = () => {

  const { forumConfig } = useForum();

  const result = useReadContract({
    ...forumConfig,
    functionName: "getRankedStatementsPage",
    args: [0n, BigInt(PAGE_SIZE)],
  });

  const statementsPage = result.data as Statement[] | undefined;

  console.log("Top statements: ", statementsPage);

  return (
    <>
      {statementsPage?.map((stmt, idx) => (
        <StatementCard key={`stmt-${idx}`} statement={stmt} />
      ))}
    </>
  );
};

export default Top;
