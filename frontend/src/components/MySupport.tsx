import { Button, Card, CardContent, Stack, Typography, TextField } from "@mui/material";
import React, { FC, useEffect, useState, } from "react";
import { forumContractConfig } from "../contracts";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import VoteToggle from "./VoteToggle";



const MySupport: FC = () => {


    const [text, setText] = useState("");

    return (
        <>


            
            <Typography variant="h4" component="div" gutterBottom>
                My Supported Statements
            </Typography>
        </>
    );
}

export default MySupport;