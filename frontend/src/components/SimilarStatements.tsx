import { FC, useCallback, useMemo, useState } from "react";
import { Box, CircularProgress, Stack, Typography } from "@mui/material";
import { useReadContract } from "wagmi";

import { useForum, FORUM_ABI } from "../state/Forum";
import { useSearch } from "@/hooks/useSearch";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import SortTabs, { SortMode } from "./SortTabs";
import StatementCard from "./StatementCard";
import { Statement } from "../types";
import { useUserVotes } from "../state/UserVotes";

interface SimilarStatementsProps {
  /** Text to search for similar statements. */
  query: string;
  /** Optional statement ID to exclude from results (e.g. the statement itself). */
  excludeId?: bigint;
  /** Statement whose effective support can be switched to a similar result. */
  switchSupportFromId?: bigint;
}

/**
 * Reusable panel that searches for and displays statements similar to the
 * given query text. Used by both CreateStatementForm and StatementPage.
 */
const SimilarStatements: FC<SimilarStatementsProps> = ({
  query,
  excludeId,
  switchSupportFromId,
}) => {
  const [sortTab, setSortTab] = useState<SortMode>("top");
  const { forumContractAddress } = useForum();
  const userVotes = useUserVotes();
  const { has: isBookmarked, toggle: toggleBookmark } =
    useLocalStorageSet("bookmarks");

  const switchSourceSupport =
    userVotes.isUserVerified && switchSupportFromId !== undefined
      ? userVotes.getEffectiveSupport(Number(switchSupportFromId))
      : 0;
  const handleSwitchSupport = useCallback(
    (targetStatementId: number) => {
      if (!userVotes.isUserVerified || switchSupportFromId === undefined) {
        return;
      }
      userVotes.switchSupport(Number(switchSupportFromId), targetStatementId);
    },
    [userVotes, switchSupportFromId],
  );
  const onSwitchSupport =
    switchSourceSupport !== 0 ? handleSwitchSupport : undefined;

  const canSwitchSupportTo = useCallback(
    (targetStatementId: number) => {
      if (!userVotes.isUserVerified || switchSourceSupport === 0) return false;
      const targetSupport = userVotes.getEffectiveSupport(targetStatementId);
      return (
        targetSupport === 0 ||
        Math.sign(targetSupport) === Math.sign(switchSourceSupport)
      );
    },
    [userVotes, switchSourceSupport],
  );

  const hasSearch = query.trim().length > 0;
  const { hits, isLoading: isSearchLoading } = useSearch(
    query,
    forumContractAddress,
    {
      similarStatementId: excludeId,
    },
  );

  // Fetch the current statement count so we can discard stale/invalid IDs
  // that would cause getStatementsById to revert.
  const { data: statementCountRaw } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "statementCount",
  });
  const statementCount =
    statementCountRaw !== undefined ? Number(statementCountRaw) : undefined;

  // Filter out any search hit whose ID is >= statementCount (stale index)
  // and optionally exclude a specific statement.
  const statementIds = useMemo(() => {
    if (statementCount === undefined) return [];
    return hits
      .filter(
        (h) =>
          h.statementId < statementCount &&
          (excludeId === undefined || BigInt(h.statementId) !== excludeId),
      )
      .map((h) => BigInt(h.statementId));
  }, [hits, statementCount, excludeId]);

  const result = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    functionName: "getStatementsById",
    args: [statementIds],
    query: { enabled: statementIds.length > 0 },
  });

  useBlockSync(result.refetch);

  const rawStatements = result.data as Statement[] | undefined;

  const relevanceOrder = useMemo(() => {
    const map = new Map<number, number>();
    hits.forEach((h, i) => map.set(h.statementId, i));
    return map;
  }, [hits]);

  const similarStatements: Statement[] = useMemo(() => {
    if (!rawStatements) return [];

    if (sortTab === "latest") {
      return [...rawStatements].sort((a, b) => Number(b.id) - Number(a.id));
    }

    if (sortTab === "relevant") {
      return [...rawStatements].sort((a, b) => {
        const ai = relevanceOrder.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER;
        const bi = relevanceOrder.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER;
        return ai - bi;
      });
    }

    // "top" → ranked first (ascending rank), then unranked in relevance order.
    const ranked: Statement[] = [];
    const unranked: Statement[] = [];

    for (const s of rawStatements) {
      if (Number(s.rank) >= 0) {
        ranked.push(s);
      } else {
        unranked.push(s);
      }
    }

    ranked.sort((a, b) => Number(a.rank) - Number(b.rank));
    unranked.sort((a, b) => {
      const ai = relevanceOrder.get(Number(a.id)) ?? Number.MAX_SAFE_INTEGER;
      const bi = relevanceOrder.get(Number(b.id)) ?? Number.MAX_SAFE_INTEGER;
      return ai - bi;
    });

    return [...ranked, ...unranked];
  }, [rawStatements, sortTab, relevanceOrder]);

  const isSimilarLoading = isSearchLoading || result.isLoading;
  const noSimilarResults = result.isError && !result.isLoading;

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Similar Statements
      </Typography>

      <SortTabs value={sortTab} onChange={setSortTab} hasSearch={hasSearch} />

      <Box sx={{ py: 0.5 }}>
        {isSimilarLoading && !noSimilarResults && hasSearch ? (
          <Stack alignItems="center" justifyContent="center" sx={{ py: 4 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Searching…
            </Typography>
          </Stack>
        ) : similarStatements.length > 0 ? (
          <Stack spacing={1}>
            {similarStatements.map((stmt) => (
              <StatementCard
                key={`similar-${Number(stmt.id)}`}
                statement={stmt}
                isBookmarked={isBookmarked(Number(stmt.id))}
                onToggleBookmark={toggleBookmark}
                onSwitchSupport={
                  canSwitchSupportTo(Number(stmt.id))
                    ? onSwitchSupport
                    : undefined
                }
              />
            ))}
          </Stack>
        ) : (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ py: 3, textAlign: "center" }}
          >
            {hasSearch
              ? "No similar statements found."
              : "Start typing to see similar statements."}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default SimilarStatements;
