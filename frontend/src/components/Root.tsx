import React, { FC, useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Outlet, useNavigate } from "react-router-dom";
import {
  Avatar,
  Button,
  Container,
  IconButton,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
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

  const {
    commitVotes,
    state: { creditBudget, remainingCredits, hasUncommittedVotes },
  } = useUserVotes();
  const navigate = useNavigate();

  const { address } = useAccount();
  const [avatar, setAvatar] = useState<string | null>(null);

  const budgetRemaining =
    remainingCredits && creditBudget
      ? (remainingCredits / creditBudget) * 100
      : 0;

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
            minHeight: "100vh",
            overflowY: "auto",
            overflowX: "visible",
          }}
        >
          <Stack spacing={1}>
            <NavTabs
              tabs={[
                { label: "Top", href: "/top" },
                { label: "My Support", href: "/my-support" },
              ]}
            />
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              justifyContent="space-between"
              sx={{ borderBottom: "1px solid lightgray", pb: 1 }}
            >
              <Typography variant="body1" component="div">
                Budget:
              </Typography>
              <LinearProgress
                variant="determinate"
                value={budgetRemaining}
                sx={{ flexGrow: 1, height: 10, borderRadius: 5 }}
              />
              <Button
                variant="contained"
                sx={{ textTransform: "none" }}
                onClick={commitVotes}
                startIcon={<DoneAllIcon />}
                disabled={!hasUncommittedVotes}
              >
                Submit Votes
              </Button>
            </Stack>
            <Outlet />
          </Stack>
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
              sx={{
                justifyContent: "flex-start",
                textTransform: "none",
                color: "black",
              }}
              start
            >
              <Typography variant="h6" component="div">
                {" "}
                Home{" "}
              </Typography>
            </Button>
            <Box>
              <Button
                variant="contained"
                startIcon={<CreateIcon />}
                sx={{ borderRadius: "16px", textTransform: "none" }}
                onClick={() => setWriteModalOpen(true)}
              >
                <Typography variant="h6" component="div">
                  {" "}
                  Write{" "}
                </Typography>
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
