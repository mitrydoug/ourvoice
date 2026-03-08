import { useEffect, useRef, useState } from "react";
import { writeQueryToHash } from "@/state/Search";

/** Maximum number of search results to fetch from the backend. */
export const SEARCH_RESULTS_LIMIT = 20;

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
  forumAddress?: string,
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

      const params = new URLSearchParams({
        statement_text: trimmed,
      });
      if (forumAddress) {
        params.set("forum_address", forumAddress);
      }

      fetch(`${SEARCH_URL}/search?${params.toString()}`)
        .then((res) => res.json())
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
          writeQueryToHash(trimmed);
        })
        .catch(() => {
          if (requestId !== inflightRef.current) return;
          setHits([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, forumAddress]);

  return { hits, isLoading };
}
