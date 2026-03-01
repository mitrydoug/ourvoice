import { useEffect, useRef, useState } from "react";

/** Maximum number of search results to fetch from the backend. */
export const SEARCH_RESULTS_LIMIT = 20;

const SEARCH_URL = import.meta.env.VITE_SEARCH_URL ?? "http://localhost:8000";

/** Debounce delay in milliseconds. */
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
 * Returns an ordered list of statement IDs sorted by relevance.
 * When `query` is empty the result set is empty immediately (no request).
 */
export function useSearch(query: string): UseSearchResult {
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

      fetch(
        `${SEARCH_URL}/search?statement_text=${encodeURIComponent(trimmed)}`,
      )
        .then((res) => res.json())
        .then((data: unknown) => {
          // Discard if a newer request has been fired.
          if (requestId !== inflightRef.current) return;

          const results = Array.isArray(data) ? data : [];
          console.log("Search results:", results);
          setHits(
            results
              .slice(0, SEARCH_RESULTS_LIMIT)
              .map((r: { statement_id: number }) => ({
                statementId: r.statement_id,
              })),
          );
          setIsLoading(false);
        })
        .catch(() => {
          if (requestId !== inflightRef.current) return;
          setHits([]);
          setIsLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  return { hits, isLoading };
}
