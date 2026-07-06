// Shared types for the browser-local search engine, including the Web Worker
// message protocol used between the main thread and the search worker.

/** Which search behavior to apply. */
export type SearchMode = "keyword" | "similarity";

/** A single statement document as held in the local index. */
export interface IndexedStatement {
  id: number;
  text: string;
}

// ---------------------------------------------------------------------------
// Worker message protocol
// ---------------------------------------------------------------------------

export type WorkerRequestBody =
  | {
      type: "index";
      forumKey: string;
      documents: IndexedStatement[];
      /** When true, replace the forum index with exactly these documents. */
      replace: boolean;
    }
  | {
      type: "search";
      forumKey: string;
      query: string;
      mode: SearchMode;
      limit: number;
    }
  | {
      type: "clear";
      forumKey: string;
    };

export type WorkerRequest = WorkerRequestBody & { requestId: number };

export type WorkerResponse =
  | { requestId: number; ok: true; result: unknown }
  | { requestId: number; ok: false; error: string };
