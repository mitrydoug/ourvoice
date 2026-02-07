import { FC, useState, useCallback, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useReadContract } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import { useUserVotes } from "../state/UserVotes";
import { Statement } from "../types";
import StatementList from "./StatementList";
import useIsMobile from "@/hooks/useIsMobile";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import useBlockSync from "@/hooks/useBlockSync";

const MyStatements: FC = () => {
  const { isUserVerified } = useUserVotes();
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();
  const { values: authoredIds } = useLocalStorageSet("authoredStatements");
  const { has: isBookmarked, toggle: toggleBookmark } =
    useLocalStorageSet("bookmarks");

  const PAGE_SIZE = isMobile ? 10 : 20;
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);

  const statementIdArgs = useMemo(
    () => authoredIds.map((id) => BigInt(id)),
    [authoredIds],
  );

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIdArgs],
    query: { enabled: statementIdArgs.length > 0 },
  });

  useBlockSync(result.refetch);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
  }, [PAGE_SIZE]);

  if (!isUserVerified) {
    return <Navigate to="/" replace />;
  }

  const allStatements = result.data as Statement[] | undefined;
  const displayedStatements = allStatements?.slice(0, displayCount) || [];
  const hasMore = allStatements ? displayCount < allStatements.length : false;

  return (
    <StatementList
      statements={displayedStatements}
      hasMore={hasMore}
      isLoading={result.isLoading}
      onLoadMore={handleLoadMore}
      isBookmarked={isBookmarked}
      onToggleBookmark={toggleBookmark}
    />
  );
};

export default MyStatements;
