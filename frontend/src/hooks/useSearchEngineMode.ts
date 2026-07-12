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
    "local",
  );
  const mode: SearchEngineMode = raw === "backend" ? "backend" : "local";
  return [mode, setRaw];
}

export default useSearchEngineMode;
