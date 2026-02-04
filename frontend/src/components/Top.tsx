import { FC, useState, useEffect, useCallback } from "react";
import { useReadContracts } from "wagmi";
import { useForum, FORUM_ABI } from "../state/Forum";
import { Statement } from "../types";
import StatementList from "./StatementList";
import useIsMobile from "@/hooks/useIsMobile";
import useBlockSync from "@/hooks/useBlockSync";

const Top: FC = () => {
  const { forumContractAddress } = useForum();
  const isMobile = useIsMobile();

  const PAGE_SIZE = isMobile ? 10 : 20;

  const [statements, setStatements] = useState<Statement[]>([]);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  // Reset state when forum changes
  useEffect(() => {
    setStatements([]);
    setOffset(0);
    setHasMore(false);
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

  console.log("Current offset: ", offset);
  console.log("Top statements fetch result: ", result);

  // Sync with blockchain on every new block
  useBlockSync(result.refetch);

  const rankedCount =
    result.data && (result.data[0].result as bigint | undefined);
  const statementsPage =
    result.data && (result.data[1].result as Statement[] | undefined);

  // Update loading state based on query status
  useEffect(() => {
    setIsLoading(result.isLoading || result.isFetching);
  }, [result.isLoading, result.isFetching]);

  // Update statements when data arrives (handles both initial load and block updates)
  useEffect(() => {
    if (statementsPage && statementsPage.length > 0 && !result.isLoading) {
      setStatements((prev) => {
        // Create a copy with updated statements at the current offset
        const newStatements = [...prev];

        // Update or append statements at the current page offset
        for (let i = 0; i < statementsPage.length; i++) {
          const index = offset + i;
          newStatements[index] = statementsPage[i];
        }

        return newStatements;
      });

      // Check if there are more statements to load
      if (rankedCount !== undefined) {
        setHasMore(offset + statementsPage.length < Number(rankedCount));
      }
    }
  }, [statementsPage, offset, rankedCount, result.isLoading]);

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setOffset((prev) => prev + PAGE_SIZE);
    }
  }, [isLoading, hasMore, PAGE_SIZE]);

  return (
    <StatementList
      statements={statements}
      hasMore={hasMore}
      isLoading={isLoading}
      onLoadMore={handleLoadMore}
    />
  );
};

export default Top;
