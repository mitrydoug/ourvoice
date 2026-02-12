import { useCallback, useEffect, useState } from "react";
import { useForum } from "../state/Forum";

/**
 * A hook that manages a Set<number> backed by localStorage.
 * The data is scoped per forum so each forum has its own set.
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
  const { name: forumName } = useForum();
  const storageKey = `ourvoice:${key}:${forumName}`;

  const [set, setSet] = useState<Set<number>>(() => {
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

  // Re-read from localStorage when the forum changes
  useEffect(() => {
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
