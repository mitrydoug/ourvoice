import { FC, useMemo } from "react";
import { metamaskIcon } from "../util";
import { useAccount } from "wagmi";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
} from "@mui/material";
import { useUserVotes } from "../state/UserVotes";

const Account: FC = () => {
  const { address } = useAccount();
  const navigate = useNavigate();

  const { isUserVerified } = useUserVotes();

  const avatar = useMemo(() => {
    if (address) {
      return metamaskIcon(address);
    }
    return null;
  }, [address]);

  return address ? (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Card
        sx={{
          p: 2,
          display: "flex",
          flexDirection: "column",
          alignContent: "center",
          width: "33%",
        }}
      >
        <CardContent>
          <Stack spacing={2} alignItems="center">
            <Avatar src={avatar} />
            <Typography variant="h5" component="div">
              Welcome!
            </Typography>
            {isUserVerified ? (
              <Stack spacing="space-between" sx={{ width: "100%" }}>
                <Typography variant="body1">Verified!</Typography>
                <Typography variant="body1">Nationality: USA</Typography>
              </Stack>
            ) : (
              <>
                <Typography variant="body1">
                  OurVoice doesn&apos;t store any information about you.
                  However, in order to participate you&apos;ll need to verify
                  that you are a human. To do this, we use ZKPassport.
                </Typography>
                <Button onClick={() => navigate("/verify")}>
                  Get Verified
                </Button>
              </>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Box>
  ) : (
    <Navigate to="/" replace />
  );
};

export default Account;
