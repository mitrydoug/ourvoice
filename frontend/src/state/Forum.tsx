import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { FORUMS } from "../contracts";
export { FORUM_ABI } from "../contracts";

type ForumName = keyof typeof FORUMS;

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
  const [forumName, setForumName] = React.useState<ForumName>("global");
  const address = useMemo(() => FORUMS[forumName], [forumName]);

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
