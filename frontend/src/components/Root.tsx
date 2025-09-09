import React, { FC, useRef, } from "react";
import AppBar from "./AppBar";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";

const Root : FC = () => {

    const layoutRef = useRef<HTMLDivElement>(null);

    return (
        <Box ref={layoutRef} sx={{ height: "100vh", width: "100vw", display: "flex" }}>
            <AppBar />
            <Outlet />
        </Box>
    );
}

export default Root;