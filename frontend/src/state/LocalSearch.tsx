// Orchestrates the browser-local search engine: owns the search Web Worker,
// builds and refreshes per-forum indexes from chain reads, persists them to
// IndexedDB, and exposes a `search` function to the rest of the app.
//
// Indexing only runs while the user has selected the local engine in Settings.
// See docs/local-search-engine-design.md.

import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { usePublicClient } from "wagmi";
import type { PublicClient } from "viem";

import { useForum } from "./Forum";
import useBlockSync from "@/hooks/useBlockSync";
import { useSearchEngineMode } from "@/hooks/useSearchEngineMode";
import { targetAverageBlockTimeSeconds, targetChain } from "@/wagmiConfig";
import {
  CONFIRMATION_BLOCKS,
  DOC_CAP,
  LOOKBACK_SECONDS,
} from "@/localSearch/config";
import {
  fetchEngagedStatementIds,
  fetchRankedStatements,
  fetchStatementsByIds,
} from "@/localSearch/chain";
import { loadForumIndex, saveForumIndex } from "@/localSearch/persistence";
import { SearchWorkerClient } from "@/localSearch/workerClient";
import type { IndexedStatement, SearchMode } from "@/localSearch/types";

interface LocalSearchContextValue {
  /** Search the current forum's local index. Returns matching statement ids. */
  search: (query: string, mode: SearchMode, limit: number) => Promise<number[]>;
  /** Whether a full index build is currently in progress. */
  isIndexing: boolean;
  /** Whether the current forum's index is ready to be queried. */
  isReady: boolean;
}

const LocalSearchContext = createContext<LocalSearchContextValue | null>(null);

const forumKeyFor = (forumAddress: string): string =>
  `${targetChain.id}:${forumAddress.toLowerCase()}`;

const lookbackBlocks = BigInt(
  Math.ceil(LOOKBACK_SECONDS / targetAverageBlockTimeSeconds),
);

export const LocalSearchProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const { forumContractAddress } = useForum();
  const publicClient = usePublicClient();
  const [engineMode] = useSearchEngineMode();

  const [isIndexing, setIsIndexing] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // The search worker is created once and lives for the page's lifetime.
  const workerRef = useRef<SearchWorkerClient | null>(null);
  if (workerRef.current === null) {
    workerRef.current = new SearchWorkerClient();
  }

  // In-memory source of truth for the active forum's documents plus sync state.
  const docsRef = useRef<Map<number, IndexedStatement>>(new Map());
  const lastSyncedBlockRef = useRef<bigint>(0n);
  const activeForumKeyRef = useRef<string>("");
  // Increments on every full sync so stale async steps can bail out.
  const syncTokenRef = useRef(0);

  // ── Full index build: on mount, forum change, or switching to local mode ──
  useEffect(() => {
    if (engineMode !== "local" || !publicClient) return;

    const forum = forumContractAddress;
    const forumKey = forumKeyFor(forum);
    const client = publicClient as unknown as PublicClient;
    const token = ++syncTokenRef.current;
    const isStale = () => token !== syncTokenRef.current;

    activeForumKeyRef.current = forumKey;
    docsRef.current = new Map();
    lastSyncedBlockRef.current = 0n;
    setIsReady(false);
    setIsIndexing(true);

    const worker = workerRef.current!;

    void (async () => {
      try {
        // 1. Hydrate instantly from any persisted index.
        const persisted = await loadForumIndex(forumKey);
        if (isStale()) return;
        if (persisted && persisted.documents.length > 0) {
          docsRef.current = new Map(persisted.documents.map((d) => [d.id, d]));
          await worker.index(forumKey, persisted.documents, true);
          if (isStale()) return;
          setIsReady(true);
        }

        // 2. Full sync from chain: ranked ∪ recently-engaged.
        const head = await client.getBlockNumber();
        if (isStale()) return;
        const safeHead =
          head > CONFIRMATION_BLOCKS ? head - CONFIRMATION_BLOCKS : head;
        const windowStart =
          safeHead > lookbackBlocks ? safeHead - lookbackBlocks : 0n;

        const ranked = await fetchRankedStatements(client, forum, DOC_CAP);
        if (isStale()) return;

        const engagedIds = await fetchEngagedStatementIds(
          client,
          forum,
          windowStart,
          safeHead,
        );
        if (isStale()) return;

        const rankedIds = new Set(ranked.map((d) => d.id));
        const engagedDocs = await fetchStatementsByIds(
          client,
          forum,
          engagedIds.filter((id) => !rankedIds.has(id)),
        );
        if (isStale()) return;

        // Merge (ranked take priority), dedup, cap.
        const merged = new Map<number, IndexedStatement>();
        for (const doc of ranked) merged.set(doc.id, doc);
        for (const doc of engagedDocs) {
          if (!merged.has(doc.id)) merged.set(doc.id, doc);
        }
        const mergedDocs = [...merged.values()].slice(0, DOC_CAP);

        docsRef.current = new Map(mergedDocs.map((d) => [d.id, d]));
        lastSyncedBlockRef.current = safeHead;

        await worker.index(forumKey, mergedDocs, true);
        if (isStale()) return;
        await saveForumIndex(forumKey, {
          documents: mergedDocs,
          lastSyncedBlock: safeHead.toString(),
        });

        setIsReady(true);
      } catch {
        // Leave any hydrated index in place; a later block-sync retries.
      } finally {
        if (!isStale()) setIsIndexing(false);
      }
    })();
  }, [engineMode, forumContractAddress, publicClient]);

  // ── Live delta: on each block-sync tick, pull newly-engaged statements ──
  // Ranked coverage refreshes on the next full sync (forum switch / reload).
  const syncDelta = useCallback(async () => {
    if (engineMode !== "local" || !publicClient) return;

    const forum = forumContractAddress;
    const forumKey = forumKeyFor(forum);
    if (forumKey !== activeForumKeyRef.current) return;

    const from = lastSyncedBlockRef.current;
    if (from === 0n) return; // full sync not yet complete

    const client = publicClient as unknown as PublicClient;
    const worker = workerRef.current!;

    try {
      const head = await client.getBlockNumber();
      const safeHead =
        head > CONFIRMATION_BLOCKS ? head - CONFIRMATION_BLOCKS : head;
      if (safeHead <= from) return;
      if (forumKey !== activeForumKeyRef.current) return;

      const engagedIds = await fetchEngagedStatementIds(
        client,
        forum,
        from + 1n,
        safeHead,
      );
      if (forumKey !== activeForumKeyRef.current) return;

      const newIds = engagedIds.filter((id) => !docsRef.current.has(id));
      if (newIds.length > 0) {
        const docs = await fetchStatementsByIds(client, forum, newIds);
        if (forumKey !== activeForumKeyRef.current) return;
        if (docs.length > 0) {
          for (const doc of docs) docsRef.current.set(doc.id, doc);
          await worker.index(forumKey, docs, false);
        }
      }

      lastSyncedBlockRef.current = safeHead;
      await saveForumIndex(forumKey, {
        documents: [...docsRef.current.values()],
        lastSyncedBlock: safeHead.toString(),
      });
    } catch {
      // Transient RPC failure; the next tick retries.
    }
  }, [engineMode, publicClient, forumContractAddress]);

  useBlockSync(syncDelta);

  const search = useCallback(
    (query: string, mode: SearchMode, limit: number): Promise<number[]> => {
      const worker = workerRef.current;
      if (!worker) return Promise.resolve([]);
      return worker.search(
        forumKeyFor(forumContractAddress),
        query,
        mode,
        limit,
      );
    },
    [forumContractAddress],
  );

  return (
    <LocalSearchContext.Provider value={{ search, isIndexing, isReady }}>
      {children}
    </LocalSearchContext.Provider>
  );
};

export function useLocalSearch(): LocalSearchContextValue {
  const ctx = useContext(LocalSearchContext);
  if (!ctx) {
    throw new Error(
      "useLocalSearch must be used within a <LocalSearchProvider>",
    );
  }
  return ctx;
}
