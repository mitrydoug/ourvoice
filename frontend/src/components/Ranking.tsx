import { Button, Card, CardContent, Stack, Typography, TextField } from "@mui/material";
import React, { FC, useEffect, useState, } from "react";
import { forumContractConfig } from "../contracts";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import VoteToggle from "./VoteToggle";


interface Statement {
    id: BigInt;
    text: string;
    voteCount: BigInt;
    rank: BigInt;
    timestamp: BigInt;
}

const STATEMENTS = [
    "The killing of Charlie Kirk is unjustifyable.",
    "Help those in Gaza.",
        "The killing of Charlie Kirk is unjustifyable.",
    "Help those in Gaza.",
        "The killing of Charlie Kirk is unjustifyable.",
    "Help those in Gaza.",
        "The killing of Charlie Kirk is unjustifyable.",
    "Help those in Gaza.",
];

const createStatement = (statement: string, writeContract) => {
    console.log("Creating statement...");
    writeContract({
        ...forumContractConfig,
        functionName: 'addStatement',
        args: [statement],
    });
}

const submitVotes = async (writeContract: any, userVotes: Map<number, number>) => {
    const votesArray = Array.from(userVotes.entries()).map(([id, count]) => ({ statementId: id, voteCount: count }));
    writeContract({
        ...forumContractConfig,
        functionName: 'vote',
        args: [votesArray],
    });
}

const getUsedCredits = (uncommittedUserVotes: Map<number, number>) => {
    return Array.from(uncommittedUserVotes.values()).reduce((acc, v) => acc + v * v, 0);
};

const USER_CREDIT_BUDGET = 100;

const Ranking: FC = () => {

    const { address } = useAccount();
    const [statements, setStatements] = React.useState<Statement[]>([]);
    const [renderCount, setRenderCount] = React.useState(0);
    const { writeContract } = useWriteContract();
    const [text, setText] = useState("");
    const [userVotes, setUserVotes] = React.useState<Map<number, number>>(new Map());
    const [uncommittedUserVotes, setUncommittedUserVotes] = React.useState<Map<number, number>>(new Map());


    const { data: statementCount } = useReadContract({
        ...forumContractConfig,
        functionName: 'statementCount',
        args: [],
    })
    console.log("Statement count:", statementCount);

    const { data: _statements } = useReadContract({
        ...forumContractConfig,
        functionName: 'getRankedStatementsRange',
        args: [0n, statementCount || 0n],
    });

    console.log("Statements:", _statements);

    useEffect(() => {
        if (_statements) {
            setStatements(_statements);
        }
    }, [statementCount, _statements]);

    const { data: userVoteSets } = useReadContract({
        ...forumContractConfig,
        functionName: 'getUserVoteSet',
        args: [],
    });

    useEffect(() => {
        if (userVoteSets !== undefined) {
            const userVotesMap = new Map<number, number>();
            userVoteSets.forEach((v, index) => {
                userVotesMap.set(Number(v.statementId), Number(v.voteCount));
            });
            setUserVotes(userVotesMap);
            setUncommittedUserVotes(userVotesMap);
        }
    }, [userVoteSets]);

    console.log("User vote count:", userVotes);
    console.log("Uncommitted user vote count:", uncommittedUserVotes);

    return (
        <>
            <TextField
                id="outlined-multiline-flexible"
                label="Multiline"
                multiline
                maxRows={4}
                value={text}
                onChange={(e) => setText(e.target.value)}
            />
            <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                <Button onClick={() => createStatement(text, writeContract)}>Create Statement</Button>
                <Button onClick={() => {
                        submitVotes(writeContract, uncommittedUserVotes);
                    }}>Submit Votes</Button>
            </Stack>
            
            <Typography variant="h4" component="div" gutterBottom>
                Top Statements
            </Typography>
            {statements?.map((stmt, idx) => (
                <Card key={`stmt-${idx}`}>
                    <CardContent>
                        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between">
                            <Typography variant="h5" component="div">
                                {stmt.id} - {stmt.text} - {stmt.voteCount}
                            </Typography>
                            <Typography variant="h5" component="div">
                                {stmt.voteCount}
                            </Typography>
                            <VoteToggle userVoteCount={uncommittedUserVotes.get(Number(stmt.id)) || 0} onUserVoteChange={(v) => setUncommittedUserVotes((m) => {
                                    let g = new Map(m);
                                    g.set(Number(stmt.id), v);
                                    const usedCredits = getUsedCredits(g);
                                    if (usedCredits > USER_CREDIT_BUDGET) {
                                        return m;
                                    }
                                    return g;
                                })}/>
                        </Stack>
                    </CardContent>
                </Card>))}
        </>
    );
}

export default Ranking;