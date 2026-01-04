import React, {
  FC,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import _ from "lodash";
import { FORUM_ABI, useForum } from "./Forum";

const USER_CREDIT_BUDGET = 100;

interface UserSupportState {
  userSupport?: Map<number, number>;
  remainingCredits?: number;
  creditBudget?: number;
  committedSupport?: Map<number, number>;
  hasUncommittedChanges?: boolean;
  error: string | null;
}

type SetSupportAction = {
  type: "SYNC_COMMITTED_SUPPORT";
  payload: Pick<UserSupportState, "userSupport">;
};

type UpdateSupportAction = {
  type: "UPDATE_SUPPORT";
  payload: { statementId: bigint; newSupportValue: bigint };
};

type UserSupportAction = SetSupportAction | UpdateSupportAction;

// Actions:
// - SYNC_COMMITTED_SUPPORT
// - UPDATE_SUPPORT

const reducer = (
  state: UserSupportState,
  action: UserSupportAction,
): UserSupportState => {
  let newState = { ...state };

  switch (action.type) {
    case "SYNC_COMMITTED_SUPPORT": {
      newState.userSupport = new Map(action.payload.userSupport);
      newState.committedSupport = new Map(action.payload.userSupport);
      break;
    }
    case "UPDATE_SUPPORT": {
      const { statementId, newSupportValue } = action.payload;
      newState.userSupport = new Map(state.userSupport);
      if (newSupportValue === BigInt(0)) {
        newState.userSupport.delete(Number(statementId));
      } else {
        newState.userSupport.set(Number(statementId), Number(newSupportValue));
      }
      break;
    }
  }

  const cost = Array.from(newState.userSupport.values()).reduce(
    (acc, v) => acc + v * v,
    0,
  );

  // let newState: UserVoteState;
  if (cost > USER_CREDIT_BUDGET) {
    newState = {
      ...state,
      error: `Support cost ${cost} exceeds budget of ${USER_CREDIT_BUDGET}`,
    };
  } else {
    newState = {
      ...newState,
      remainingCredits: USER_CREDIT_BUDGET - cost,
      creditBudget: USER_CREDIT_BUDGET,
      hasUncommittedChanges: !_.isEqual(
        newState.userSupport,
        newState.committedSupport,
      ),
      error: null,
    };
  }

  console.log("Updating state: ", newState);
  return newState;
};

type UserNotVerifiedContextValue = {
  isUserVerified: false;
  state: undefined;
  dispatch: undefined;
  commitSupport: undefined;
};

type UserSupportContextValue = {
  isUserVerified: true;
  state: UserSupportState;
  dispatch: React.Dispatch<UserSupportAction>;
  commitSupport: () => void;
};

export const UserVoteContext = createContext<
  UserNotVerifiedContextValue | UserSupportContextValue | undefined
>(undefined);

export const UserVoteProvider: FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, { error: null });
  const { writeContract } = useWriteContract();
  const { address } = useAccount();
  const { forumContractAddress } = useForum();
  console.log("UserVoteProvider for address: ", address);

  const { data: isUserVerified } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: address,
    functionName: "isMember",
    args: [],
    query: {
      enabled: !!address,
    },
  });

  console.log("User verified status: ", isUserVerified);

  const { data: _support } = useReadContract({
    address: forumContractAddress,
    abi: FORUM_ABI,
    account: address,
    functionName: "getUserStatementSupport",
    args: [],
    query: {
      enabled: Boolean(address && isUserVerified),
    },
  });

  console.log("Fetched user support from contract: ", _support);

  useEffect(() => {
    // Load state from blockchain
    if (_support) {
      const supportMap = new Map<number, number>();
      _support.forEach((s) => {
        supportMap.set(Number(s.statementId), Number(s.support));
      });
      dispatch({
        type: "SYNC_COMMITTED_SUPPORT",
        payload: { userSupport: supportMap },
      });
    }
  }, [_support, address]);

  const commitSupport = useCallback(async () => {
    if (state.userSupport && state.committedSupport) {
      console.log("Committing support changes: ", state.userSupport);
      
      // Calculate adjustments (difference from committed state)
      const adjustments: { statementId: bigint; value: bigint }[] = [];
      
      // Process new/changed support values
      state.userSupport.forEach((newValue, statementId) => {
        const oldValue = state.committedSupport!.get(statementId) || 0;
        const delta = newValue - oldValue;
        if (delta !== 0) {
          adjustments.push({
            statementId: BigInt(statementId),
            value: BigInt(delta),
          });
        }
      });
      
      // Process removed support (statements that were in committed but not in new)
      state.committedSupport.forEach((oldValue, statementId) => {
        if (!state.userSupport!.has(statementId)) {
          adjustments.push({
            statementId: BigInt(statementId),
            value: BigInt(-oldValue),
          });
        }
      });
      
      if (adjustments.length > 0) {
        writeContract({
          address: forumContractAddress,
          abi: FORUM_ABI,
          functionName: "adjustSupport",
          args: [adjustments],
        });
      }
    }
  }, [state.userSupport, state.committedSupport, writeContract, forumContractAddress]);

  if (isUserVerified) {
    return (
      <UserVoteContext.Provider
        value={{ isUserVerified: isUserVerified, state, dispatch, commitSupport }}
      >
        {children}
      </UserVoteContext.Provider>
    );
  } else {
    return (
      <UserVoteContext.Provider
        value={{
          isUserVerified: !!isUserVerified,
          state: undefined,
          dispatch: undefined,
          commitSupport: undefined,
        }}
      >
        {children}
      </UserVoteContext.Provider>
    );
  }
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
