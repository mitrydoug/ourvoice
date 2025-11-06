import React, { FC } from "react";
import { useReadContract } from "wagmi";
import { useUserVotes } from "../state/UserVotes";
import StatementCard from "./StatementCard";
import { useForum, FORUM_ABI } from "../state/Forum";

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
  } = useUserVotes();
  const { forumContractAddress } = useForum();

  console.log("User votes map: ", userVotes);

  const statementIds = userVotes
    ? Array.from(userVotes.entries())
        .sort((e1, e2) => e2[1] - e1[1])
        .map((e) => BigInt(e[0]))
    : [];

  console.log("Fetching statements for IDs: ", statementIds);

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIds],
  });

  const myStatements = result.data as Statement[] | undefined;

  console.log("My supported statements: ", myStatements);

  return (
    <>
      {myStatements?.map((stmt, idx) => (
        <StatementCard key={`stmt-${idx}`} statement={stmt} />
      ))}
    </>
  );
};

export default MySupport;
