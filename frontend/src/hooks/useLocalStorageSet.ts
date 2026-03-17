import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useForum } from "../state/Forum";

/**
 * A hook that manages a Set<number> backed by localStorage.
 *
 * The storage key is scoped by:
 *   - forum name  — each forum has its own set
 *   - chain fingerprint  — derived from the genesis block hash so data is
 *     automatically invalidated whenever the chain is reset
 *   - wallet address  — per-user data stays private to each account
 *
 * Returns empty data (no reads/writes) until the chain fingerprint has been
 * resolved, preventing any stale-deployment data from leaking through.
 */
const useLocalStorageSet = (
  key: string,
): {
  values: number[];
  has: (id: number) => boolean;
  add: (id: number) => void;
  remove: (id: number) => void;
  toggle: (id: number) => void;
} => {
  const { name: forumName, chainFingerprint } = useForum();
  const { address } = useAccount();

  // Shorten address to first 4 bytes (10 chars inc. "0x") for a compact key.
  const addrKey = address ? address.slice(0, 10) : "anon";

  // storageKey is undefined while the chain fingerprint is loading — hooks
  // that depend on it will return empty data during that window.
  const storageKey =
    chainFingerprint !== undefined
      ? `symvolia:${key}:${chainFingerprint}:${forumName}:${addrKey}`
      : undefined;

  const [set, setSet] = useState<Set<number>>(() => {
    if (!storageKey) return new Set();
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return new Set(JSON.parse(stored) as number[]);
      }
    } catch {
      // localStorage might be unavailable or data corrupted
    }
    return new Set();
  });

  // Re-read from localStorage when the key changes (forum, fingerprint, or address)
  useEffect(() => {
    if (!storageKey) {
      setSet(new Set());
      return;
    }
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setSet(new Set(JSON.parse(stored) as number[]));
      } else {
        setSet(new Set());
      }
    } catch {
      setSet(new Set());
    }
  }, [storageKey]);

  // Persist to localStorage whenever the set changes
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify([...set]));
    } catch {
      // Silently fail if localStorage is unavailable or quota exceeded
    }
  }, [set, storageKey]);

  const has = useCallback((id: number) => set.has(id), [set]);

  const add = useCallback(
    (id: number) => {
      setSet((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        return next;
      });
    },
    [setSet],
  );

  const remove = useCallback(
    (id: number) => {
      setSet((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    },
    [setSet],
  );

  const toggle = useCallback(
    (id: number) => {
      setSet((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [setSet],
  );

  const values = [...set];

  return { values, has, add, remove, toggle };
};

export default useLocalStorageSet;
