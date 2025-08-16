import React from 'react';
import PageContainer from './PageContainer';
import Box from '@mui/material/Box';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';

const STATEMENTS = [
    "Dogs are better than cats",
    "We're not prepared for AI",
    "The Earth is flat",
    "Pineapple belongs on pizza",
    "The best superhero is Batman",
]

const Ranking = () => {
    return (
        <PageContainer>
            <Box sx={{ width: '100%', height: '100%' }}>
                <List>
                    {STATEMENTS.map((statement, index) => (
                        <ListItemButton key={index}>
                            <ListItemText primary={statement} secondary={"what"} />
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </PageContainer>
    );
}

export default Ranking;