import React, { FC } from 'react';
import PageContainer from './PageContainer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';

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

const RankingRow : FC<RankingRowProps> = ({ index, text, votes }) => {
    return (
        <Box sx={{ minHeight: 48, display: 'flex', width: "100%" }}>
            <Box sx={{ width: "2rem", height: "3rem", display: 'flex', flexDirection: "column"}}>
                <Typography variant="h3">{index}</Typography>
            </Box>
            <Box sx={{ width: "20rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem"}}>
                <Typography variant="subtitle1" sx={{ flexGrow: 1}}>{text}</Typography>
            </Box>
            <Box sx={{ width: "5rem", height: "3rem", display: 'flex', flexDirection: "column", paddingTop: "0.2rem"}}>
                <Typography variant="subtitle2">{votes} votes</Typography>
            </Box> 
        </Box>
    );
};

const Ranking = () => {
    return ( 
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ flexGrow: 1 }}>
                <List>
                    {STATEMENTS.map(({ text, votes }, index) => (
                        <ListItemButton key={index}>
                            <RankingRow index={index} text={text} votes={votes} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
            { /* <iframe src="HTTPS://www.ililililili.com/pv-index" title="description"></iframe> */}
        </Box>
    );
}

export default Ranking;