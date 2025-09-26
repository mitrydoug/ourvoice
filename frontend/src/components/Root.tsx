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
      <AppBar />
      <Container
        component="main"
        maxWidth="md"
        sx={{ display: "flex", flexDirection: "column", my: 16, gap: 4 }}
      >
        <NavTabs
          tabs={[
            { label: "Top", href: "/top" },
            { label: "My Support", href: "/my-support" },
          ]}
        />
        <TextField
          id="outlined-multiline-flexible"
          label="Multiline"
          multiline
          maxRows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Stack
          direction="row"
          spacing={2}
          alignItems="center"
          justifyContent="space-between"
        >
          <Button onClick={() => createStatement()}>Create Statement</Button>
          <Button onClick={() => commitVotes()}>Submit Votes</Button>
        </Stack>
        <Outlet />
      </Container>
    </Box>
  );
};

export default Root;
