import React, { FC, useContext, useEffect, } from 'react';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import Typography from '@mui/material/Typography';
import AppContext from '../context/AppContext';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import VoteToggle from './VoteToggle';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';

interface Statement {
    id: number;
    text: string;
    votes: number;
}

interface RankingRowProps {
    index: number;
    text: string;
    votes: number;
    userVotes: number;
    onUserVoteChange: (newVoteCount: number) => void;
}

const USER_CREDIT_BUDGET = 100;

const getUsedCredits = (uncommittedUserVotes: Map<number, number>) => {
    return Array.from(uncommittedUserVotes.values()).reduce((acc, v) => acc + v * v, 0);
};

const submitStatement = async (polyVoice: any, text: string) => {
    const tx = await polyVoice.addStatement(text);
    console.log("Transaction submitted:", tx);
};

const submitVotes = async (polyVoice: any, userVotes: Map<number, number>) => {
    const votesArray = Array.from(userVotes.entries()).map(([id, count]) => ({ statementId: id, voteCount: count }));
    const tx = await polyVoice.vote(votesArray);
    console.log("Votes submitted:", tx);
}

const RankingRow: FC<RankingRowProps> = ({ index, text, votes, userVotes, onUserVoteChange }) => {
    return (
        <Box sx={{ minHeight: 48, display: 'flex', width: "100%" }}>
            <Box sx={{ width: "2rem", height: "3rem", display: 'flex', flexDirection: "column" }}>
                <Typography variant="h3">{index+1}</Typography>
            </Box>
            <Box sx={{ width: "20rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem" }}>
                <Typography variant="subtitle1">{text}</Typography>
            </Box>
            <Box sx={{ width: "10rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem" }}>
                <Typography variant="subtitle1">{votes} votes</Typography>
            </Box>
            <Box sx={{ width: "10rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem" }}>
                <VoteToggle userVoteCount={userVotes} onUserVoteChange={onUserVoteChange}/>
            </Box>
        </Box>
    );
};

const Ranking = () => {

    const { polyVoice } = useContext(AppContext);
    const [statements, setStatements] = React.useState<Statement[]>([]);
    const [renderCount, setRenderCount] = React.useState(0);

    const [userVotes, setUserVotes] = React.useState<Map<number, number>>(new Map());

    const [uncommittedUserVotes, setUncommittedUserVotes] = React.useState<Map<number, number>>(new Map());


    useEffect(() => {
        if (!polyVoice) return;

        (async () => {
            //const what = await polyVoice.vote([[0, 1], [1, 5]]);
            const userVotesMap = new Map<number, number>();
            const userVoteSets = await polyVoice.getUserVoteSet();
            userVoteSets.forEach((v, index) => {
                userVotesMap.set(Number(v.statementId), Number(v.voteCount));
            });


            console.log("User vote count:", userVotesMap);
            setUserVotes(userVotesMap);
            setUncommittedUserVotes(userVotesMap);
        })();
    }, [polyVoice]);


    useEffect(() => {
        if (!polyVoice) return;

        (async () => {
            const statementCount = await polyVoice.statementCount();
            console.log("Statement count:", statementCount);

            const statements: Statement[] = [];

            for (let i = 0; i < statementCount; i++) {
                const statement = await polyVoice.getRankedStatement(i);
                statements.push({ id: statement.id, text: statement.text, votes: statement.voteCount });
                console.log(statements);
            }
            setStatements(statements);
            await new Promise(f => setTimeout(f, 1000));
            setRenderCount(prev => prev + 1);
        })();
    }, [polyVoice, renderCount]);

    const usedCredits = getUsedCredits(uncommittedUserVotes);

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ padding: "0.5rem", width: "100%", display: 'flex', flexDirection: "column" }}>
                <TextField
                    id="user-statement"
                    multiline
                    rows={2}
                    placeholder="What do you stand for?"
                    variant="standard" />
                <Stack direction="row" spacing={1} sx={{ marginTop: "0.5rem" }}>
                    <Button variant="outlined" onClick={() => {
                        submitStatement(polyVoice, document.getElementById("user-statement").value);
                    }}>Submit Statement</Button>
                    <Button variant="outlined" disabled={userVotes == uncommittedUserVotes} onClick={() => {
                        submitVotes(polyVoice, uncommittedUserVotes);
                    }}>Submit Votes!</Button>
                </Stack>
            </Box>
            <Box sx={{ width: '100%', padding: "0.5rem" }}>
                <LinearProgress variant="determinate" value={(1 - usedCredits/USER_CREDIT_BUDGET)*100} />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <List>
                    {statements.map(({ id, text, votes }, index) => {
                        return (
                            <ListItemButton key={index} sx={{ border: "1px solid lightgrey" }}>
                                <RankingRow index={index} text={text} votes={votes} userVotes={uncommittedUserVotes.get(Number(id))} onUserVoteChange={(v) => setUncommittedUserVotes((m) => {
                                    let g = new Map(m);
                                    g.set(Number(id), v);
                                    const usedCredits = getUsedCredits(g);
                                    if (usedCredits > USER_CREDIT_BUDGET) {
                                        return m;
                                    }
                                    return g;
                                })}/>
                            </ListItemButton>
                        );
                    })}
                </List>
            </Box>
            { /* <iframe src="HTTPS://www.ililililili.com/pv-index" title="description"></iframe> */}
        </Box>
    );
}

export default Ranking;