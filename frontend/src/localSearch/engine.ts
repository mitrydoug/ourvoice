// MiniSearch-backed local search engine.
//
// The `LocalSearchEngine` interface is intentionally narrow so the underlying
// engine can be swapped later (e.g. to Orama for hybrid/vector search) without
// touching call sites. Only this file depends on MiniSearch directly.

import MiniSearch, { SearchOptions } from "minisearch";
import { STOP_WORDS } from "./stopwords";
import type { IndexedStatement, SearchMode } from "./types";

// Keyword mode: user types loose keywords. OR-combine with BM25 ranking so docs
// matching more terms rank higher; prefix + light fuzzy for partial words/typos.
const KEYWORD_OPTIONS: SearchOptions = {
  combineWith: "OR",
  prefix: true,
  fuzzy: 0.2,
};

// Similarity mode: the query is a drafted statement. OR-combine (with BM25
// length normalization) surfaces partial matches without over-penalizing
// statements that miss some query keywords.
const SIMILARITY_OPTIONS: SearchOptions = {
  combineWith: "OR",
  fuzzy: 0.1,
};

export interface LocalSearchEngine {
  /** Replace the entire index with exactly these documents. */
  replaceAll(documents: IndexedStatement[]): void;
  /** Add or update documents, preserving the rest of the index. */
  upsert(documents: IndexedStatement[]): void;
  /** Remove documents by id. */
  remove(ids: number[]): void;
  /** Return matching statement ids, most relevant first, capped at `limit`. */
  search(query: string, mode: SearchMode, limit: number): number[];
  /** Number of documents currently indexed. */
  size(): number;
}

function createMiniSearch(): MiniSearch<IndexedStatement> {
  return new MiniSearch<IndexedStatement>({
    idField: "id",
    fields: ["text"],
    storeFields: [],
    processTerm: (term) => {
      const lower = term.toLowerCase();
      if (lower.length < 2) return null;
      if (STOP_WORDS.has(lower)) return null;
      return lower;
    },
  });
}

export class MiniSearchEngine implements LocalSearchEngine {
  private index = createMiniSearch();
  private ids = new Set<number>();

  replaceAll(documents: IndexedStatement[]): void {
    this.index = createMiniSearch();
    this.ids = new Set();
    this.upsert(documents);
  }

  upsert(documents: IndexedStatement[]): void {
    for (const doc of documents) {
      if (this.ids.has(doc.id)) {
        this.index.replace(doc);
      } else {
        this.index.add(doc);
        this.ids.add(doc.id);
      }
    }
  }

  remove(ids: number[]): void {
    for (const id of ids) {
      if (this.ids.has(id)) {
        this.index.discard(id);
        this.ids.delete(id);
      }
    }
  }

  search(query: string, mode: SearchMode, limit: number): number[] {
    const options =
      mode === "similarity" ? SIMILARITY_OPTIONS : KEYWORD_OPTIONS;
    return this.index
      .search(query, options)
      .slice(0, limit)
      .map((result) => Number(result.id));
  }

  size(): number {
    return this.ids.size;
  }
}
