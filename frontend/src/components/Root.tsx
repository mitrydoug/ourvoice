import React, { FC, useRef, useState } from "react";
import AppBar from "./AppBar";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Button, Container, Stack, Tab, Tabs, TextField, Toolbar } from "@mui/material";
import NavTabs from "./NavTabs";

const Root : FC = () => {

    const [text, setText] = useState("");
    const layoutRef = useRef<HTMLDivElement>(null);

    return (
        <Box ref={layoutRef}>
            <AppBar/>
            <Container component="main" maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', my: 16, gap: 4 }}>
                <NavTabs tabs={[{ label: "Top", href: "/top" }, { label: "My Support", href: "/my-support" }]}/>
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
                <Outlet />
            </Container>
        </Box>
    );
}

export default Root;