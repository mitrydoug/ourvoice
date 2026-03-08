import { FC, useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Card,
  CircularProgress,
  InputBase,
  Stack,
  Typography,
} from "@mui/material";
import { useReadContract } from "wagmi";
import { useNavigate } from "react-router-dom";

import { useUserVotes } from "../state/UserVotes";
import { useForum, FORUM_ABI } from "../state/Forum";
import { useSearch } from "@/hooks/useSearch";
import useBlockSync from "@/hooks/useBlockSync";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import VoteToggle from "./VoteToggle";
import SortTabs, { SortMode } from "./SortTabs";
import StatementCard from "./StatementCard";
import { Statement } from "../types";

const MAX_STATEMENT_LENGTH = 280;

const CreateStatementForm: FC = () => {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [initialSupport, setInitialSupport] = useState(0);
  const [sortTab, setSortTab] = useState<SortMode>("top");

  const { isUserVerified, stageStatement, setPendingDraftCost } =
    useUserVotes();
  const { forumContractAddress } = useForum();
  const { has: isBookmarked, toggle: toggleBookmark } =
    useLocalStorageSet("bookmarks");

  // ── Similar-statements search ──────────────────────────────────────────
  const hasSearch = text.trim().length > 0;
  const { hits, isLoading: isSearchLoading } = useSearch(
    text,
    forumContractAddress,
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

  // Filter out any search hit whose ID is >= statementCount (stale index).
  const statementIds = useMemo(() => {
    if (statementCount === undefined) return [];
    return hits
      .filter((h) => h.statementId < statementCount)
      .map((h) => BigInt(h.statementId));
  }, [hits, statementCount]);

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
      // Pure Meilisearch relevance order.
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

  // ── Handlers ───────────────────────────────────────────────────────────
  const updateText = useCallback((textVal: string) => {
    if (textVal.length <= MAX_STATEMENT_LENGTH) {
      setText(textVal);
    }
  }, []);

  // Keep the credit bar in sync with the draft's initial support
  const draftCreditCost =
    (Math.abs(initialSupport) * (Math.abs(initialSupport) + 1)) / 2;
  useEffect(() => {
    setPendingDraftCost(draftCreditCost);
    return () => setPendingDraftCost(0);
  }, [draftCreditCost, setPendingDraftCost]);

  const handleCreate = useCallback(() => {
    if (text.length > 0 && isUserVerified && stageStatement) {
      setPendingDraftCost(0);
      stageStatement(text, initialSupport);
      void navigate("/");
    }
  }, [text, initialSupport, isUserVerified, stageStatement, setPendingDraftCost, navigate]);

  const handleCancel = useCallback(() => {
    setPendingDraftCost(0);
    void navigate("/");
  }, [setPendingDraftCost, navigate]);

  return (
    <Box>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <Typography
        variant="h6"
        sx={{ pb: 1.5, fontWeight: 600 }}
      >
        New Statement
      </Typography>

      {/* Statement input — card-style with vote toggle on the right */}
      <Card sx={{ p: 2 }}>
        <Stack direction="row" spacing={2}>
          {/* Text area + char count */}
          <Stack sx={{ flex: 1, minWidth: 0 }} spacing={0.5}>
            <InputBase
              placeholder="What's on your mind?"
              value={text}
              onChange={(e) => updateText(e.target.value)}
              multiline
              minRows={3}
              maxRows={6}
              autoFocus
              sx={{
                fontSize: "1.05rem",
                lineHeight: 1.5,
                width: "100%",
              }}
            />
            <Typography
              variant="body2"
              sx={{
                textAlign: "right",
                fontWeight:
                  text.length < MAX_STATEMENT_LENGTH * 0.9
                    ? "normal"
                    : "bold",
              }}
              color={
                text.length < MAX_STATEMENT_LENGTH * 0.8
                  ? "text.secondary"
                  : text.length < MAX_STATEMENT_LENGTH * 0.9
                    ? "DarkOrange"
                    : "red"
              }
            >
              {text.length} / {MAX_STATEMENT_LENGTH}
            </Typography>
          </Stack>

          {/* Vertical vote toggle on the right */}
          <Stack
            alignItems="center"
            justifyContent="center"
            sx={{ flexShrink: 0 }}
          >
            <VoteToggle
              userSupport={initialSupport}
              uncommittedSupport={initialSupport !== 0}
              onUserVoteChange={setInitialSupport}
              direction="vertical"
            />
          </Stack>
        </Stack>
      </Card>

      {/* ── Action buttons ──────────────────────────────────────────── */}
      <Stack
        direction="row"
        justifyContent="flex-end"
        spacing={2}
        sx={{ mt: 2 }}
      >
        <Button onClick={handleCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={text.trim().length === 0}
          onClick={handleCreate}
        >
          Create
        </Button>
      </Stack>

      {/* ── Similar Statements ────────────────────────────────────── */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
          Similar Statements
        </Typography>

        <SortTabs value={sortTab} onChange={setSortTab} hasSearch={hasSearch} />

        <Box sx={{ py: 0.5 }}>
          {isSimilarLoading && !noSimilarResults && hasSearch ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ py: 4 }}
            >
              <CircularProgress size={24} />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
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
    </Box>
  );
};

export default CreateStatementForm;
