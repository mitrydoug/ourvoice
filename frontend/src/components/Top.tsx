import { FC, useState, useEffect, useCallback, useRef } from "react";
import { useReadContracts } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";
import useIsMobile from "@/hooks/useIsMobile";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";

/** Minimum time (ms) the loading spinner is shown when paginating */
const PAGINATION_MIN_LOADING_MS = 2000;

const Top: FC = () => {
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();
  const { has: isBookmarked, toggle: toggleBookmark } =
    useLocalStorageSet("bookmarks");

  const PAGE_SIZE = isMobile ? 10 : 20;

  const [statements, setStatements] = useState<Statement[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [isPaginationLoading, setIsPaginationLoading] = useState(false);
  const paginationTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Clean up pagination timer on unmount
  useEffect(() => {
    return () => {
      if (paginationTimerRef.current) clearTimeout(paginationTimerRef.current);
    };
  }, []);

  // Reset state when forum changes
  useEffect(() => {
    setStatements([]);
    setOffset(0);
    setHasMore(false);
    setPageIndex(0);
    setIsPaginationLoading(false);
    if (paginationTimerRef.current) clearTimeout(paginationTimerRef.current);
  }, [forumContractAddress]);

  const result = useReadContracts({
    contracts: [
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "rankedCount",
        args: [],
      },
      {
        address: forumContractAddress,
        abi: FORUM_ABI,
        functionName: "getRankedStatementsPage",
        args: [BigInt(offset), BigInt(PAGE_SIZE)],
      },
    ],
  });

  // Sync with blockchain on every new block
  useBlockSync(result.refetch);

  const rankedCount = result.data && result.data[0].result;
  const statementsPage =
    result.data && (result.data[1].result as Statement[] | undefined);

  // Loading state: initial query or pagination in progress.
  // Block-sync refetches (isFetching) are intentionally excluded to avoid flicker.
  const isLoading = result.isLoading || isPaginationLoading;

  // Update statements when data arrives (handles both initial load and block updates)
  useEffect(() => {
    if (statementsPage && statementsPage.length > 0 && !result.isLoading) {
      setStatements((prev) => {
        const newStatements = [...prev];
        for (let i = 0; i < statementsPage.length; i++) {
          newStatements[offset + i] = statementsPage[i];
        }
        return newStatements;
      });

      if (rankedCount !== undefined) {
        setHasMore(offset + statementsPage.length < Number(rankedCount));
      }
    }
  }, [statementsPage, offset, rankedCount, result.isLoading]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
      setPageIndex((prev) => prev + 1);
      setIsPaginationLoading(true);

      // Keep the loading spinner visible for a minimum duration
      if (paginationTimerRef.current) clearTimeout(paginationTimerRef.current);
      paginationTimerRef.current = setTimeout(() => {
        setIsPaginationLoading(false);
      }, PAGINATION_MIN_LOADING_MS);
    }
  }, [isLoading, hasMore, PAGE_SIZE]);

  return (
    <StatementList
      statements={statements}
      hasMore={hasMore}
      isLoading={isLoading}
      onLoadMore={handleLoadMore}
      pageIndex={pageIndex}
      isBookmarked={isBookmarked}
      onToggleBookmark={toggleBookmark}
    />
  );
};

export default Top;
