import useLocalStorageValue from "./useLocalStorageValue";

export type SearchEngineMode = "backend" | "local";

export const SEARCH_ENGINE_STORAGE_KEY = "symvolia:settings:searchEngine";

/**
 * The user's selected search engine, persisted per browser. Defaults to the
 * hosted backend engine; "local" runs search entirely in the browser.
 */
export function useSearchEngineMode(): [
  SearchEngineMode,
  (mode: SearchEngineMode) => void,
] {
  const [raw, setRaw] = useLocalStorageValue(
    SEARCH_ENGINE_STORAGE_KEY,
    "backend",
  );
  const mode: SearchEngineMode = raw === "local" ? "local" : "backend";
  return [mode, setRaw];
}

export default useSearchEngineMode;
