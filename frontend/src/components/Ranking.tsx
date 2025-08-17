import React, { FC, useContext, useEffect, } from 'react';
import PageContainer from './PageContainer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import AppContext from '../context/AppContext';
import TextField from '@mui/material/TextField';

interface Statement {
    text: string;
    votes: number;
}

const STATEMENTS: Statement[] = [
    { text: "Dogs are better than cats", votes: 23456 },
    { text: "We're not prepared for AI", votes: 12345 },
    { text: "The Earth is flat", votes: 9876 },
    { text: "Pineapple belongs on pizza", votes: 8765 },
    { text: "The best superhero is Batman", votes: 7654 },
]

interface RankingRowProps {
    index: number;
    text: string;
    votes: number;
}

const RankingRow: FC<RankingRowProps> = ({ index, text, votes }) => {
    return (
        <Box sx={{ minHeight: 48, display: 'flex', width: "100%" }}>
            <Box sx={{ width: "2rem", height: "3rem", display: 'flex', flexDirection: "column" }}>
                <Typography variant="h3">{index}</Typography>
            </Box>
            <Box sx={{ width: "20rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem" }}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1 }}>{text}</Typography>
            </Box>
            <Box sx={{ width: "5rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem" }}>
                <Typography variant="subtitle2">{votes} votes</Typography>
            </Box>
        </Box>
    );
};

const Ranking = () => {

    const { polyVoice } = useContext(AppContext);
    const [firstStatement, setFirstStatement] = React.useState<string | null>(null);

    console.log(polyVoice);

    useEffect(() => {
        if (!polyVoice) return;
        // if (firstStatement) return;

        /*(async () => {
            const tx = await polyVoice.addStatement("Pursue what your heart desires");
        })();*/

        polyVoice.statements(0).then((statement) => {
            console.log("First statement:", statement.text);
            setFirstStatement(statement.text);
        });
    }, [polyVoice]);

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ padding: "0.5rem", width: "100%", display: 'flex', flexDirection: "column" }}>
                <TextField
                    id="outlined-multiline-static"
                    multiline
                    rows={2}
                    placeholder="What do you stand for?"
                    variant="standard"/>
            </Box>
            <Box sx={{ flexGrow: 1 }}>
                <List>
                    {STATEMENTS.map(({ text, votes }, index) => {
                        if (index === 0 && firstStatement) {
                            text = firstStatement;
                        }
                        return (
                            <ListItemButton key={index}>
                                <RankingRow index={index} text={text} votes={votes} />
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