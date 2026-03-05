import { FC, useMemo, useState, useCallback } from "react";
import { useReadContract } from "wagmi";
import { useUserVotes } from "../state/UserVotes";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";
import { Navigate } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";

const MySupport: FC = () => {
  const { isUserVerified, state: userVoteState } = useUserVotes();
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();
  const { has: isBookmarked, toggle: toggleBookmark } =
    useLocalStorageSet("bookmarks");

  const PAGE_SIZE = isMobile ? 10 : 20;

  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const [pageIndex, setPageIndex] = useState(0);

  // Combine on-chain support with pending adjustments to get all supported statement IDs
  const statementIds = useMemo(() => {
    const supportMap = new Map<number, number>();

    // Add all on-chain support entries
    for (const [
      id,
      support,
    ] of userVoteState?.onChain?.statementSupport?.entries() || []) {
      supportMap.set(id, support);
    }

    // Apply adjustments from staged state
    for (const [
      id,
      adjustment,
    ] of userVoteState?.staged?.supportAdjustments?.entries() || []) {
      const currentSupport = supportMap.get(id) || 0;
      supportMap.set(id, currentSupport + adjustment);
    }

    // Filter to only statements with positive effective support, sort by support descending
    return Array.from(supportMap.entries())
      .filter(([, support]) => support > 0)
      .sort((e1, e2) => e2[1] - e1[1])
      .map((e) => BigInt(e[0]));
  }, [userVoteState]);

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIds],
  });

  // Sync with blockchain on every new block
  useBlockSync(result.refetch);

  const handleLoadMore = useCallback(() => {
    setDisplayCount((prev) => prev + PAGE_SIZE);
    setPageIndex((prev) => prev + 1);
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
      pageIndex={pageIndex}
      isBookmarked={isBookmarked}
      onToggleBookmark={toggleBookmark}
      showStagedStatements
    />
  );
};

export default MySupport;
