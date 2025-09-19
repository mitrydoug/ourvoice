import React, { FC, useRef, } from "react";
import AppBar from "./AppBar";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Container, Toolbar } from "@mui/material";

const Root : FC = () => {

    const layoutRef = useRef<HTMLDivElement>(null);

    return (
        <Box ref={layoutRef}>
            <AppBar/>
            <Container component="main" maxWidth="md" sx={{ display: 'flex', flexDirection: 'column', my: 16, gap: 4 }}>
                <Outlet />
            </Container>
        </Box>
    );
}

export default Root;