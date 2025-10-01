import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { forumContractConfig } from "../contracts";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import _ from "lodash";

const USER_CREDIT_BUDGET = 100;

interface UserVoteState {
  userVotes?: Map<number, number>;
  remainingCredits?: number;
  creditBudget?: number;
  committedVotes?: Map<number, number>;
  hasUncommittedVotes?: boolean;
  error: string | null;
}

type SetVotesAction = {
  type: "SYNC_COMMITTED_VOTES";
  payload: Pick<UserVoteState, "userVotes">;
};

type UpdateVoteAction = {
  type: "UPDATE_VOTE";
  payload: { statementId: bigint; newVoteCount: bigint };
};

type UserVoteAction = SetVotesAction | UpdateVoteAction;

// Actions:
// - SYNC_COMMITTED_VOTES
// - UPDATE_VOTE

const reducer = (
  state: UserVoteState,
  action: UserVoteAction,
): UserVoteState => {
  let newState = { ...state };

  switch (action.type) {
    case "SYNC_COMMITTED_VOTES": {
      newState.userVotes = new Map(action.payload.userVotes);
      newState.committedVotes = new Map(action.payload.userVotes);
      break;
    }
    case "UPDATE_VOTE": {
      const { statementId, newVoteCount } = action.payload;
      newState.userVotes = new Map(state.userVotes);
      newState.userVotes.set(Number(statementId), Number(newVoteCount));
      break;
    }
  }

  const cost = Array.from(newState.userVotes.values()).reduce(
    (acc, v) => acc + v * v,
    0,
  );

  // let newState: UserVoteState;
  if (cost > USER_CREDIT_BUDGET) {
    newState = {
      ...state,
      error: `Vote cost ${cost} exceeds budget of ${USER_CREDIT_BUDGET}`,
    };
  } else {
    newState = {
      ...newState,
      remainingCredits: USER_CREDIT_BUDGET - cost,
      creditBudget: USER_CREDIT_BUDGET,
      hasUncommittedVotes: !_.isEqual(
        newState.userVotes,
        newState.committedVotes,
      ),
      error: null,
    };
  }

  console.log("Updating state: ", newState);
  return newState;
};

interface UserVoteContextValue {
  state: UserVoteState;
  dispatch: React.Dispatch<UserVoteAction>;
  commitVotes: () => void;
}

export const UserVoteContext = createContext<UserVoteContextValue | undefined>(
  undefined,
);

export const UserVoteProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, { error: null });
  const { writeContract } = useWriteContract();
  const { address } = useAccount();
  console.log("UserVoteProvider for address: ", address);

  const { data: _votes } = useReadContract({
    ...forumContractConfig,
    account: address,
    functionName: "getUserVoteSet",
    args: [],
  });

  console.log("Fetched user votes from contract: ", _votes);

  useEffect(() => {
    // Load initial state from blockchain
    const votesMap = new Map<number, number>();
    if (_votes) {
      _votes.forEach((v) => {
        votesMap.set(Number(v.statementId), Number(v.voteCount));
      });
    }
    dispatch({
      type: "SYNC_COMMITTED_VOTES",
      payload: { userVotes: votesMap },
    });
  }, [_votes, address]);

  const commitVotes = useCallback(async () => {
    if (state.userVotes) {
      console.log("Committing votes: ", state.userVotes);
      const votesArray = Array.from(state.userVotes.entries()).map(
        ([id, count]) => ({
          statementId: BigInt(id),
          voteCount: BigInt(count),
        }),
      );
      writeContract({
        ...forumContractConfig,
        functionName: "vote",
        args: [votesArray],
      });
    }
  }, [state.userVotes, writeContract]);

  return (
    <UserVoteContext.Provider value={{ state, dispatch, commitVotes }}>
      {children}
    </UserVoteContext.Provider>
  );
};

export const useUserVotes = () => {
  const state = useContext(UserVoteContext);
  if (!state) {
    throw new Error(
      "useUserVoteContext must be used within a UserVoteProvider",
    );
  }
  return state;
};
