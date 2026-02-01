import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";
import { FORUMS } from "../contracts";
export { FORUM_ABI } from "../contracts";

const FORUM_STORAGE_KEY = "ourvoice:selectedForum";

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
  } catch (error) {
    // localStorage might be unavailable (privacy mode, SSR, etc.)
    // Silently fail and return null
  }
  return null;
};

type ForumContextValue = {
  forumContractAddress: `0x${string}`;
  name: string;
  setForum: (name: ForumName) => void;
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

  useEffect(() => {
    try {
      localStorage.setItem(FORUM_STORAGE_KEY, forumName);
    } catch (error) {
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
