import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { FORUMS, FORUM_ABI } from "../contracts";
import _ from "lodash";

type ForumName = keyof typeof FORUMS;

type ForumContextValue = {
  forumConfig: { address: `0x${string}`; abi: any };
  name: string;
  setForum: (name: ForumName) => void;
};

export const ForumContext = createContext<ForumContextValue | undefined>(undefined);

export const ForumProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {

  const [forumName, setForumName] = React.useState<ForumName>("global");
  const address = useMemo(() => FORUMS[forumName], [forumName]);

  const setForum = useCallback((name: ForumName) => {
    setForumName(name);
  }, [setForumName]);

  return (
    <ForumContext.Provider
      value={{ forumConfig: { address, abi: FORUM_ABI }, name: forumName, setForum }}
    >
      {children}
    </ForumContext.Provider>
  );
};

export const useForum = () => {
  const state = useContext(ForumContext);
  if (!state) {
    throw new Error(
      "useForum must be used within a ForumProvider",
    );
  }
  return state;
};
