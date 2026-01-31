import React, { FC, useMemo, useState, useCallback } from "react";
import { useReadContract } from "wagmi";
import { useUserVotes } from "../state/UserVotes";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";
import { Navigate } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";

const MySupport: FC = () => {
  const { isUserVerified, state: userVoteState } = useUserVotes();
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();

  const PAGE_SIZE = isMobile ? 10 : 20;

  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const statementIds = useMemo(
    () =>
      Array.from(userVoteState?.staged?.statementSupport?.entries() || [])
        .sort((e1, e2) => e2[1] - e1[1])
        .map((e) => BigInt(e[0])),
    [userVoteState],
  );

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIds],
  });

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  }, [PAGE_SIZE]);

  if (!isUserVerified) {
    return <Navigate to="/" replace />;
  }

  const myStatements = result.data as Statement[] | undefined;
  const displayedStatements = myStatements?.slice(0, displayCount) || [];
  const hasMore = myStatements ? displayCount < myStatements.length : false;

  return (
    <StatementList
      statements={displayedStatements}
      hasMore={hasMore}
      isLoading={result.isLoading}
      onLoadMore={handleLoadMore}
    />
  );
};

export default MySupport;
