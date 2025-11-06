import React, { FC } from "react";
import { useReadContract } from "wagmi";
import StatementCard from "./StatementCard";
import { useForum, FORUM_ABI } from "../state/Forum";

const PAGE_SIZE = 25;

interface Statement {
  id: bigint;
  text: string;
  voteCount: bigint;
  rank: bigint;
  timestamp: bigint;
}

const Top: FC = () => {
  const { forumContractAddress } = useForum();

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
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
