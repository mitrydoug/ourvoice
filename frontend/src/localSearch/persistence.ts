// IndexedDB persistence for the browser-local search engine, backed by
// idb-keyval. We persist the raw document set plus the last-synced block per
// forum so a returning user hydrates instantly and only fetches the delta.
//
// Storing raw documents (rather than a serialized MiniSearch index) keeps the
// on-disk format engine-agnostic; re-indexing a few thousand short statements
// is cheap.

import { del, get, set } from "idb-keyval";
import type { IndexedStatement } from "./types";

export interface PersistedForumIndex {
  documents: IndexedStatement[];
  /** Last block scanned, as a decimal string (bigint is not JSON-safe). */
  lastSyncedBlock: string;
}

const storageKey = (forumKey: string): string =>
  `symvolia:local-search:${forumKey}`;

export async function loadForumIndex(
  forumKey: string,
): Promise<PersistedForumIndex | undefined> {
  try {
    return await get<PersistedForumIndex>(storageKey(forumKey));
  } catch {
    return undefined;
  }
}

export async function saveForumIndex(
  forumKey: string,
  data: PersistedForumIndex,
): Promise<void> {
  try {
    await set(storageKey(forumKey), data);
  } catch {
    // Best-effort cache; ignore quota/availability errors.
  }
}

export async function clearForumIndex(forumKey: string): Promise<void> {
  try {
    await del(storageKey(forumKey));
  } catch {
    // Ignore.
  }
}
