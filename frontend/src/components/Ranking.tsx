import { Button, Card, CardContent, Typography } from "@mui/material";
import React, { FC } from "react";
import { forumContractConfig } from "../contracts";
import { useAccount, useReadContract, useWriteContract } from "wagmi";


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

const createStatement = (writeContract) => {
    console.log("Creating statement...");
    writeContract({
        ...forumContractConfig,
        functionName: 'addStatement',
        args: ["This is a new statement"],
    });
}

const Ranking: FC = () => {

    const { address } = useAccount();

    const { writeContract, error, data: hash } = useWriteContract();
    console.log("Write contract error:", error);
    console.log("Write contract hash:", hash);

    const { data } = useReadContract({
        ...forumContractConfig,
        functionName: 'getUserVoteSet',
        args: [],
    })
    console.log("Read contract result:", data);


    return (
        <>
            <Button onClick={() => createStatement(writeContract)}>Create Statement</Button>
            <Typography variant="h4" component="div" gutterBottom>
                Top Statements
            </Typography>
            {data?.map((stmt, idx) => (
                <Card key={`stmt-${idx}`}>
                    <CardContent>
                        <Typography variant="h5" component="div">
                            {stmt.statementId}
                        </Typography>
                    </CardContent>
                </Card>))}
        </>
    );
}

export default Ranking;