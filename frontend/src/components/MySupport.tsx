import React, { FC, useMemo, useState } from "react";
import { useReadContract } from "wagmi";
import { useUserVotes } from "../state/UserVotes";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";
import { Navigate } from "react-router-dom";

const PAGE_SIZE = 10;

const MySupport: FC = () => {
  const { isUserVerified, state: userVoteState } = useUserVotes();

  const { forumContractAddress } = useForum();

  const [page, setPage] = useState(1);

  const statementIds = useMemo(
    () =>
      Array.from(userVoteState?.userVotes?.entries() || [])
        .sort((e1, e2) => e2[1] - e1[1])
        .map((e) => BigInt(e[0])),
    [userVoteState],
  );

  console.log("Fetching statements for IDs: ", statementIds);

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIds],
  });

  if (!isUserVerified) {
    return <Navigate to="/" replace />;
  }

  console.log("Read contract result: ", result);

  const myStatements = result.data as Statement[] | undefined;
  const lastPage = statementIds.length / PAGE_SIZE + 1;

  console.log("My supported statements: ", myStatements);

  return myStatements ? (
    <StatementList
      statements={myStatements}
      page={page}
      pageCount={lastPage}
      onPageChange={setPage}
    />
  ) : (
    <></>
  );
};

export default MySupport;
