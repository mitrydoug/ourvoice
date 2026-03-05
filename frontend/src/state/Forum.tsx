import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePublicClient } from "wagmi";
import { FORUMS } from "../contracts";
export { FORUM_ABI } from "../contracts";

const FORUM_STORAGE_KEY = "ourvoice:selectedForum";

/**
 * Keys that must survive a chain-fingerprint sweep because they are either
 * chain-agnostic (selected forum) or already scoped by address (nickname).
 */
const SWEEP_EXEMPT_PREFIXES = ["ourvoice:selectedForum", "ourvoice:nickname:"];

/**
 * Remove all `ourvoice:*` localStorage keys that do not belong to the
 * current chain deployment (identified by `fingerprint`).
 */
const sweepStaleKeys = (fingerprint: string) => {
  try {
    const keys = Object.keys(localStorage).filter(
      (k) =>
        k.startsWith("ourvoice:") &&
        !SWEEP_EXEMPT_PREFIXES.some((p) => k.startsWith(p)) &&
        !k.includes(fingerprint),
    );
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // Silently fail if localStorage is unavailable
  }
};

type ForumName = keyof typeof FORUMS;

const isValidForumName = (value: string): value is ForumName => {
  return value in FORUMS;
};

const getStoredForum = (): ForumName | null => {
  try {
    const stored = localStorage.getItem(FORUM_STORAGE_KEY);
    if (stored && isValidForumName(stored)) {
      return stored;
    }
  } catch {
    // localStorage might be unavailable (privacy mode, SSR, etc.)
    // Silently fail and return null
  }
  return null;
};

type ForumContextValue = {
  forumContractAddress: `0x${string}`;
  name: string;
  setForum: (name: ForumName) => void;
  /**
   * A short hex string derived from the genesis block hash that uniquely
   * identifies this chain deployment. `undefined` until the genesis block
   * has been fetched. localStorage reads/writes should be gated on this.
   */
  chainFingerprint: string | undefined;
};

export const ForumContext = createContext<ForumContextValue | undefined>(
  undefined,
);

export const ForumProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [forumName, setForumName] = React.useState<ForumName>(() => {
    return getStoredForum() ?? "global";
  });
  const address = useMemo(() => FORUMS[forumName], [forumName]);
  const publicClient = usePublicClient();

  // Fingerprint derived from the genesis block hash — unique per chain
  // instance. Changes whenever the chain is reset (docker compose down -v).
  const [chainFingerprint, setChainFingerprint] = useState<string | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!publicClient) return;
    let cancelled = false;
    publicClient
      .getBlock({ blockNumber: 0n })
      .then((block) => {
        if (cancelled) return;
        // Use 12 hex chars (6 bytes) — short enough for a key suffix,
        // collision-resistant enough for a local cache-bust fingerprint.
        const fp = (block.hash ?? "unknown").slice(2, 14);
        sweepStaleKeys(fp);
        setChainFingerprint(fp);
      })
      .catch(() => {
        if (!cancelled) setChainFingerprint("unknown");
      });
    return () => {
      cancelled = true;
    };
  }, [publicClient]);

  useEffect(() => {
    try {
      localStorage.setItem(FORUM_STORAGE_KEY, forumName);
    } catch {
      // localStorage might be unavailable or quota exceeded
      // Silently fail to avoid breaking the app
    }
  }, [forumName]);

  const setForum = useCallback(
    (name: ForumName) => {
      setForumName(name);
    },
    [setForumName],
  );

  return (
    <ForumContext.Provider
      value={{
        forumContractAddress: address,
        name: forumName,
        setForum,
        chainFingerprint,
      }}
    >
      {children}
    </ForumContext.Provider>
  );
};

export const useForum = () => {
  const state = useContext(ForumContext);
  if (!state) {
    throw new Error("useForum must be used within a ForumProvider");
  }
  return state;
};
