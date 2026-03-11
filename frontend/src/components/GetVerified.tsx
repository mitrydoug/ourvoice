import { FC, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  CircularProgress,
  Container,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { useWriteContract } from "wagmi";
import {
  registryContractConfig,
  mockRegistryContractConfig,
  isDevMode,
} from "../contracts";
import VerifiedIcon from "@mui/icons-material/Verified";

const MY_ICON_URL = "https://i.imgur.com/I86xH4n.png";
const MY_SCOPE = "our-voice-verify";

type VERIFY_PHASE =
  | "PRE_SCAN"
  | "GENERATING_PROOF"
  | "PROOF_GENERATED"
  | "VERIFIED"
  | "REJECTED"
  | "ERROR";

type MethodCardProps = {
  title: string;
  imgSrc: string;
  description: string;
};

const METHOD_CARDS: MethodCardProps[] = [
  {
    title: "Personhood",
    imgSrc: "Global.png",
    description:
      "Verify that you are a unique human being, and nothing else! You will be able to participate in the Earth forum.",
  },
  {
    title: "Nationality",
    imgSrc: "Nationality.png",
    description:
      "Verify that you are a unique human being from a specific country. You will be able to participate in both the Earth forum and country-specific forums.",
  },
];

type ChooseMethodProps = {
  onContinue: (methodIndex: number) => void;
  onBack: () => void;
};

const ChooseMethod: FC<ChooseMethodProps> = ({ onContinue, onBack }) => {
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  return (
    <Container maxWidth="md" sx={{ textAlign: "center" }}>
      <Stack justifyContent="space-between" spacing={4} sx={{ mt: 5 }}>
        <h1>Choose a Method</h1>
        <Stack direction="row" spacing={3} sx={{ justifyContent: "center" }}>
          {METHOD_CARDS.map((card, index) => (
            <Card key={`method-${index}`} sx={{ width: "20rem" }}>
              <CardActionArea
                onClick={() => setSelectedCard(index)}
                data-active={selectedCard === index ? "" : undefined}
                sx={{
                  height: "100%",
                  "&[data-active]": {
                    backgroundColor: "light",
                    "&:hover": {
                      backgroundColor: "light",
                    },
                  },
                }}
              >
                <CardContent sx={{ padding: 2 }}>
                  <h2>{card.title}</h2>
                  <img src={card.imgSrc} style={{ maxWidth: "100%" }} />
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Stack>
        <Typography variant="body1" gutterBottom sx={{ mt: 5 }}>
          {selectedCard !== null ? METHOD_CARDS[selectedCard].description : ""}
        </Typography>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Button onClick={onBack}>Back</Button>
          <Button
            onClick={() => onContinue(selectedCard as number)}
            disabled={selectedCard == null}
          >
            Continue
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
};

type VerifyProps = {
  methodIndex: number;
  onBack: () => void;
};

const Verify: FC<VerifyProps> = ({ methodIndex, onBack }) => {
  const revealContry = useMemo(() => methodIndex === 1, [methodIndex]);
  const navigate = useNavigate();

  const [verifyPhase, setVerifyPhase] = useState<VERIFY_PHASE>("PRE_SCAN");

  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const zkPassport = useMemo(() => new ZKPassport(), []);

  const { writeContract } = useWriteContract();

  const devModeRegister = useCallback(() => {
    writeContract(
      {
        ...mockRegistryContractConfig,
        functionName: "register",
        args: [""],
      },
      {
        onError: (error) => {
          console.error("Error writing contract:", error);
        },
      },
    );

    setTimeout(() => {
      void navigate("/");
    }, 5000);
  }, [writeContract, navigate]);

  useEffect(() => {
    const constructRequest = async () => {
      // Create a request with your app details
      const queryBuilder = await zkPassport.request({
        name: "Symvolia",
        // A description of the purpose of the request
        purpose: "Roll call",
        logo: MY_ICON_URL,
        // Optional scope for the user's unique identifier
        scope: MY_SCOPE,
        // To verify proofs on EVM chains, you need to set the mode to "compressed-evm"
        mode: "compressed-evm",
        devMode: isDevMode,
      });

      // Build your query with the required attributes or conditions you want to verify
      const {
        url,
        onRequestReceived,
        onGeneratingProof,
        onProofGenerated,
        onResult,
        onReject,
        onError,
      } = revealContry
          ? queryBuilder
            // Verify the user's age is greater than or equal to 18
            .gte("age", 18)
            .disclose("nationality")
            // Bind to the chain where the proof will be verified
            .bind("chain", "ethereum_sepolia")
            // Finalize the query
            .done()
          : queryBuilder
            // Verify the user's age is greater than or equal to 18
            .gte("age", 18)
            // Bind to the chain where the proof will be verified
            .bind("chain", "ethereum_sepolia")
            // Finalize the query
            .done();

      let proof: ProofResult;

      // Use the proofResult from the onProofGenerated callback to get the proof
      onProofGenerated((proofResult) => {
        console.log("Proof generated:", proofResult);
        proof = proofResult;
        setVerifyPhase("PROOF_GENERATED");
      });

      onResult(({ uniqueIdentifier, verified, result }) => {
        console.log("Result received:", uniqueIdentifier, verified, result);
        setVerifyPhase(verified ? "VERIFIED" : "REJECTED");

        if (!verified) {
          // If the proof is not verified, save yourself some gas and return straight away
          console.log("Proof is not verified");
          return;
        }

        // Get the verification parameters
        const verifierParams = zkPassport.getSolidityVerifierParameters({
          proof: proof,
          // Use the same scope as the one you specified with the request function
          scope: MY_SCOPE,
          devMode: isDevMode,
        });

        console.log("Submitting on-chain verification transaction...");
        console.log("Verifier parameters:", verifierParams);

        writeContract(
          {
            ...registryContractConfig,
            functionName: "register",
            // The zkpassport SDK types `version` as `string` rather than
            // `0x${string}`, causing a mismatch with the on-chain ABI.
            // The runtime value is always a valid hex string.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            args: [verifierParams as any],
          },
          {
            onError: (error) => {
              console.error("Error writing contract:", error);
            },
          },
        );

        setTimeout(() => {
          void navigate("/");
        }, 5000);
      });

      onRequestReceived(() => {
        console.log("Request received");
      });

      onGeneratingProof(() => {
        setVerifyPhase("GENERATING_PROOF");
        console.log("Generating proof...");
      });

      onReject(() => {
        setVerifyPhase("REJECTED");
        console.log("Rejected");
      });

      onError((error) => {
        setVerifyPhase("ERROR");
        console.error("Error:", error);
      });

      setVerifyUrl(url);
    };

    void constructRequest();
  }, [zkPassport, revealContry, navigate, writeContract]);

  return (
    <Container maxWidth="md" sx={{ textAlign: "center" }}>
      <Stack justifyContent="space-between" spacing={4} sx={{ mt: 5 }}>
        <h1>Get Verified</h1>
        <Typography variant="body1" gutterBottom>
          To get verified, please scan the QR code below with your ZKPassport
          app and follow the instructions.
        </Typography>
        <Stack direction="row" justifyContent="center">
          {verifyUrl && (
            <Paper elevation={3} sx={{ p: 2, borderRadius: 5 }}>
              <Stack spacing={2}>
                {verifyPhase === "PRE_SCAN" ? (
                  <>
                    <QRCodeSVG value={verifyUrl} size={256} level="L" />
                    {isDevMode && (
                      <Button onClick={() => devModeRegister()}>
                        [DEV_MODE] Register
                      </Button>
                    )}
                  </>
                ) : (
                  <Box
                    sx={{
                      width: 256,
                      height: 256,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      flexDirection: "column",
                      gap: 5,
                    }}
                  >
                    {verifyPhase === "GENERATING_PROOF" ? (
                      <>
                        <CircularProgress size="3rem" />
                        <Typography variant="body1" gutterBottom>
                          Generating your proof, please wait...
                        </Typography>
                      </>
                    ) : verifyPhase === "PROOF_GENERATED" ? (
                      <>
                        <CircularProgress size="3rem" />
                        <Typography variant="body1" gutterBottom>
                          Proof generated! Verifying on-chain...
                        </Typography>
                      </>
                    ) : verifyPhase === "VERIFIED" ? (
                      <>
                        <VerifiedIcon fontSize="large" />
                        <Typography variant="body1" gutterBottom>
                          You have been successfully verified! Returning to
                          home...
                        </Typography>
                      </>
                    ) : verifyPhase === "REJECTED" ? (
                      <Typography variant="body1" gutterBottom>
                        Verification rejected. Please try again.
                      </Typography>
                    ) : verifyPhase === "ERROR" ? (
                      <Typography variant="body1" gutterBottom>
                        An error occurred during verification. Please try again.
                      </Typography>
                    ) : null}
                  </Box>
                )}
              </Stack>
            </Paper>
          )}
        </Stack>
        <Stack direction="row">
          <Button onClick={onBack}>Back</Button>
        </Stack>
      </Stack>
    </Container>
  );
};

export const GetVerified: FC = () => {
  const [methodIndex, setMethodIndex] = useState<number | null>(null);
  const navigate = useNavigate();

  if (methodIndex === null) {
    return (
      <ChooseMethod
        onContinue={setMethodIndex}
        onBack={() => void navigate("/")}
      />
    );
  } else {
    return (
      <Verify methodIndex={methodIndex} onBack={() => setMethodIndex(null)} />
    );
  }
};

export default GetVerified;
