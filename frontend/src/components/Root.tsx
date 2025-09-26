import React, { FC, useRef, useState } from "react";
import AppBar from "./AppBar";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Button, Container, Stack, TextField } from "@mui/material";
import NavTabs from "./NavTabs";
import { useUserVotes } from "../state/UserVotes";
import { useWriteContract } from "wagmi";
import { forumContractConfig } from "../contracts";

const Root: FC = () => {
  const [text, setText] = useState("");
  const layoutRef = useRef<HTMLDivElement>(null);
  const { writeContract } = useWriteContract();

  const { commitVotes } = useUserVotes();

  const createStatement = async () => {
    if (text.length > 0) {
      await writeContract({
        ...forumContractConfig,
        functionName: "addStatement",
        args: [text],
      });
      setText("");
    }
  };

  return (
    <Box ref={layoutRef}>
      <Container
        component="main"
        maxWidth="sm"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          borderLeft: "1px solid black",
          borderRight: "1px solid black",
          minHeight: "100vh",
        }}
      >
        <NavTabs
          tabs={[
            { label: "Top", href: "/top" },
            { label: "My Support", href: "/my-support" },
          ]}
        />
        {/*<Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Button onClick={() => createStatement()}>Create Statement</Button>
          <Button onClick={() => commitVotes()}>Submit Votes</Button>
        </Stack>*/}
        <Outlet />
      </Container>
    </Box>
  );
};

export default Root;
