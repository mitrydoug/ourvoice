import React, { FC, createContext, useCallback, useContext, useEffect, useReducer } from "react";
import { forumContractConfig } from "../contracts";
import { useReadContract, useWriteContract } from "wagmi";

const USER_CREDIT_BUDGET = 100;

interface UserVoteState {
    userVotes?: Map<number, number>;
    remainingCredits?: number;
    error: string | null;
}

type SetVotesAction = { type: 'SET_VOTES'; payload: Pick<UserVoteState, 'userVotes'>; };

type UpdateVoteAction = { type: 'UPDATE_VOTE'; payload: { statementId: bigint; newVoteCount: bigint; }; };

type UserVoteAction = SetVotesAction | UpdateVoteAction;

// Actions:
// - SET_STATE
// - INCREMENT_VOTE
// - DECREMENT_VOTE

const reducer = (state: UserVoteState, action: UserVoteAction): UserVoteState => {

    let newUserVotes: Map<number, number>;

    switch (action.type) {
        case 'SET_VOTES': {
            newUserVotes = new Map(action.payload.userVotes);
            break;
        }
        case 'UPDATE_VOTE': {
            const { statementId, newVoteCount } = action.payload;
            newUserVotes = new Map(state.userVotes);
            const currentCount = newUserVotes.get(Number(statementId)) || 0;
            newUserVotes.set(Number(statementId), Number(newVoteCount));
            break;
        }
    }

    const cost = Array.from(newUserVotes.values()).reduce((acc, v) => acc + v * v, 0);
    let newState: UserVoteState;
    if (cost > USER_CREDIT_BUDGET) {
        newState = { ...state, error: `Vote cost ${cost} exceeds budget of ${USER_CREDIT_BUDGET}` };
    } else {
        newState = { ...state, userVotes: newUserVotes, remainingCredits: USER_CREDIT_BUDGET - cost , error: null };
    }

    console.log("Updating state: ", newState);
    return newState;
};

interface UserVoteContextValue {
    state: UserVoteState;
    dispatch: React.Dispatch<UserVoteAction>;
    commitVotes: () => void;
}

export const UserVoteContext = createContext<UserVoteContextValue | undefined>(undefined);

export const UserVoteProvider: FC<{ children: React.ReactNode }> = ({ children }) => {

    const [state, dispatch] = useReducer(reducer, { error: null });
    const { writeContract } = useWriteContract()

    const { data: _votes } = useReadContract({
        ...forumContractConfig,
        functionName: 'getUserVoteSet',
        args: [],
    });
 
    useEffect(() => {
        // Load initial state from blockchain
        const votesMap = new Map<number, number>();
        if (_votes) {
            _votes.forEach((v) => {
                votesMap.set(Number(v.statementId), Number(v.voteCount));
            });
        }
        dispatch({ type: 'SET_VOTES', payload: { userVotes: votesMap } });
    }, [_votes]);

    const commitVotes = useCallback(async () => {
        if (state.userVotes) {
            console.log("Committing votes: ", state.userVotes);
            const votesArray = Array.from(state.userVotes.entries()).map(([id, count]) => ({ statementId: BigInt(id), voteCount: BigInt(count) }));
            writeContract({
                ...forumContractConfig,
                functionName: 'vote',
                args: [votesArray],
            });
        }
    }, [state.userVotes]);


    return (
        <UserVoteContext.Provider value={{ state, dispatch, commitVotes }}>
            {children}
        </UserVoteContext.Provider>
    );
};

export const useUserVotes = () => {
    const state = useContext(UserVoteContext);
    if (!state) {
        throw new Error("useUserVoteContext must be used within a UserVoteProvider");
    }
    return state;
};
