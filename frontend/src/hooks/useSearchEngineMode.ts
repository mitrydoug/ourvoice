import { useEffect } from "react";
import { optionalEnvValue } from "@/envVars";
import useLocalStorageValue from "./useLocalStorageValue";

export type SearchEngineMode = "backend" | "local";

export const SEARCH_ENGINE_STORAGE_KEY = "symvolia:settings:searchEngine";
export const backendSearchUrl = optionalEnvValue(import.meta.env.VITE_SEARCH_URL);
export const hasBackendSearch = backendSearchUrl !== undefined;

/**
 * The user's selected search engine, persisted per browser. When backend
 * search is unavailable, the stored value is normalised back to "local".
 */
export function useSearchEngineMode(): [
  SearchEngineMode,
  (mode: SearchEngineMode) => void,
] {
  const [raw, setRaw] = useLocalStorageValue(
    SEARCH_ENGINE_STORAGE_KEY,
    "local",
  );

  useEffect(() => {
    if (!hasBackendSearch && raw === "backend") {
      setRaw("local");
    }
  }, [raw, setRaw]);

  const mode: SearchEngineMode =
    hasBackendSearch && raw === "backend" ? "backend" : "local";

  return [mode, setRaw];
}

export default useSearchEngineMode;
