import React, { FC, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Outlet, useNavigate } from "react-router-dom";
import { Avatar, Button, Container, IconButton, Stack } from "@mui/material";
import NavTabs from "./NavTabs";
import { useUserVotes } from "../state/UserVotes";
import { useAccount } from "wagmi";
import CreateIcon from "@mui/icons-material/Create";
import DoneAllIcon from "@mui/icons-material/DoneAll";

import jazzicon from "@metamask/jazzicon";
import WriteModal from "./WriteModal";
const metamaskIcon = (address: string) => {
  console.log(address);
  const jazziconData = jazzicon(16, parseInt(address.slice(2, 10), 16));
  const jazziconSvg = new XMLSerializer().serializeToString(
    jazziconData.children[0],
  );
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
};

const Root: FC = () => {
  const layoutRef = useRef<HTMLDivElement>(null);

  const [writeModalOpen, setWriteModalOpen] = useState(false);

  const { commitVotes } = useUserVotes();
  const navigate = useNavigate();

  const { address } = useAccount();
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (address) {
      setAvatar(metamaskIcon(address));
    } else {
      setAvatar(null);
    }
  }, [address]);

  return (
    <>
      <Box ref={layoutRef} sx={{ position: "relative" }}>
        <Container
          component="main"
          maxWidth="sm"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            borderLeft: "1px solid gray",
            borderRight: "1px solid gray",
            minHeight: "100vh",
            overflowY: "auto",
            overflowX: "visible",
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
        <Box
          component="nav"
          sx={{
            position: "fixed",
            left: "50%",
            top: "0px",
            padding: "10px",
            width: "200px",
            transform: (theme) =>
              `translateX(-100%) translateX(-${theme.breakpoints.values.sm / 2}px)`,
          }}
        >
          <Stack spacing={1} sx={{}}>
            <Box>
              <IconButton
                size="large"
                aria-label="account of current user"
                aria-controls="menu-appbar"
                aria-haspopup="true"
                onClick={() => {}}
                color="inherit"
              >
                <Avatar src={avatar} />
              </IconButton>
            </Box>
            <Button
              onClick={() => navigate("/top")}
              sx={{ justifyContent: "flex-start" }}
            >
              {" "}
              Home{" "}
            </Button>
            <Button
              onClick={() => navigate("/my-support")}
              sx={{ justifyContent: "flex-start" }}
            >
              {" "}
              My Support{" "}
            </Button>
            <Box>
              <Button
                variant="contained"
                startIcon={<CreateIcon />}
                sx={{ borderRadius: "16px" }}
                onClick={() => setWriteModalOpen(true)}
              >
                {" "}
                Write{" "}
              </Button>
            </Box>
            <Box>
              <Button
                variant="contained"
                startIcon={<DoneAllIcon />}
                sx={{ borderRadius: "16px" }}
                onClick={commitVotes}
              >
                {" "}
                Submit Votes{" "}
              </Button>
            </Box>
          </Stack>
        </Box>
      </Box>
      <WriteModal
        open={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
      />
    </>
  );
};

export default Root;
