import { useEffect, useRef, useState } from "react";
import { writeQueryToHash } from "@/state/Search";

/** Maximum number of search results to fetch from the backend. */
const configuredSearchResultsLimit = Number.parseInt(
  import.meta.env.VITE_SEARCH_RESULTS_LIMIT ?? "20",
  10,
);

if (
  !Number.isFinite(configuredSearchResultsLimit) ||
  configuredSearchResultsLimit <= 0
) {
  throw new Error("VITE_SEARCH_RESULTS_LIMIT must be a positive number");
}

export const SEARCH_RESULTS_LIMIT = configuredSearchResultsLimit;

const SEARCH_URL = import.meta.env.VITE_SEARCH_URL ?? "http://localhost:8000";

/** Debounce delay in milliseconds before hitting the search API. */
const DEBOUNCE_MS = 300;

export interface SearchHit {
  statementId: number;
}

interface UseSearchResult {
  /** Ordered list of statement IDs matching the query (by relevance). */
  hits: SearchHit[];
  /** Whether a search request is in-flight. */
  isLoading: boolean;
}

/**
 * Debounced full-text search against the backend `/search` endpoint.
 *
 * Waits {@link DEBOUNCE_MS} after the last `query` change before firing the
 * request.  On a successful response the URL hash is updated so the query
 * is reflected in a copyable/bookmarkable URL.
 *
 * Returns an ordered list of statement IDs sorted by relevance.
 * When `query` is empty the result set is cleared immediately (no request)
 * and the URL is **not** touched (the caller handles clearing via
 * `clearQuery`).
 */
export function useSearch(
  query: string,
  forumAddress: string,
  {
    updateUrl = false,
    similarStatementId,
  }: { updateUrl?: boolean; similarStatementId?: bigint } = {},
): UseSearchResult {
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Track the latest request so we can discard stale responses.
  const inflightRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const timer = setTimeout(() => {
      const requestId = ++inflightRef.current;

      const lexicalParams = new URLSearchParams({
        statement_text: trimmed,
        forum_address: forumAddress,
      });

      const similarParams =
        similarStatementId === undefined
          ? undefined
          : new URLSearchParams({
              statement_id: similarStatementId.toString(),
              forum_address: forumAddress,
              limit: SEARCH_RESULTS_LIMIT.toString(),
            });

      const fetchResults = async (): Promise<unknown> => {
        if (similarParams !== undefined) {
          const similarResponse = await fetch(
            `${SEARCH_URL}/similar?${similarParams.toString()}`,
          );
          if (similarResponse.ok) {
            return similarResponse.json();
          }
        }

        const lexicalResponse = await fetch(
          `${SEARCH_URL}/search?${lexicalParams.toString()}`,
        );
        if (!lexicalResponse.ok) {
          throw new Error("Search request failed");
        }
        return lexicalResponse.json();
      };

      fetchResults()
        .then((data: unknown) => {
          if (requestId !== inflightRef.current) return;

          const results = Array.isArray(data) ? data : [];
          setHits(
            results
              .slice(0, SEARCH_RESULTS_LIMIT)
              .map((r: { statement_id: number }) => ({
                statementId: r.statement_id,
              })),
          );
          setIsLoading(false);

          // Sync the successfully-searched query to the URL.
          if (updateUrl) {
            writeQueryToHash(trimmed);
          }
        })
        .catch(() => {
          if (requestId !== inflightRef.current) return;
          setHits([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, forumAddress, updateUrl, similarStatementId]);

  return { hits, isLoading };
}
