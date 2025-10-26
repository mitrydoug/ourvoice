import React, { FC, useCallback, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import { Box, Checkbox, CircularProgress, Container, Stack, Typography } from "@mui/material";
import { useWriteContract } from "wagmi";
import { registryContractConfig } from "../contracts";

const MY_ICON_URL = "https://i.imgur.com/I86xH4n.png";
const MY_SCOPE = "our-voice-verify";

type VERIFY_PHASE = "PRE_SCAN" | "GENERATING_PROOF" | "PROOF_GENERATED" | "VERIFIED" | "REJECTED" | "ERROR";

export const GetVerified: FC = () => {

  const [revealContry, setRevealCountry] = useState<boolean>(false);
  const [verifyPhase, setVerifyPhase] = useState<VERIFY_PHASE>("PRE_SCAN");

  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const zkPassport = useMemo(() => new ZKPassport(), []);

  const { writeContract } = useWriteContract();

  useEffect(() => {
    const constructRequest = async () => {
      // Create a request with your app details
      const queryBuilder = await zkPassport.request({
        name: "Our Voice",
        // A description of the purpose of the request
        purpose: "Roll call",
        logo: MY_ICON_URL,
        // Optional scope for the user's unique identifier
        scope: MY_SCOPE,
        // To verify proofs on EVM chains, you need to set the mode to "compressed-evm"
        mode: "compressed-evm",
      });

      // Build your query with the required attributes or conditions you want to verify
      const {
        url,
        requestId,
        onRequestReceived,
        onGeneratingProof,
        onProofGenerated,
        onResult,
        onReject,
        onError,
      } = revealContry ? (
        queryBuilder
          // Verify the user's age is greater than or equal to 18
          .gte("age", 18)
          .disclose("nationality")
          // Bind to the chain where the proof will be verified
          .bind("chain", "ethereum_sepolia")
          // Finalize the query
          .done()
      ) : (
        queryBuilder
          // Verify the user's age is greater than or equal to 18
          .gte("age", 18)
          // Bind to the chain where the proof will be verified
          .bind("chain", "ethereum_sepolia")
          // Finalize the query
          .done()
      );

      let proof: ProofResult;

      // Use the proofResult from the onProofGenerated callback to get the proof
      onProofGenerated((proofResult) => {
        console.log("Proof generated:", proofResult);
        proof = proofResult;
        setVerifyPhase("PROOF_GENERATED");
      });

      onResult(async ({ uniqueIdentifier, verified, result }) => {
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
        });

        console.log("Submitting on-chain verification transaction...");
        console.log("Verifier parameters:", verifierParams);

        writeContract({
            ...registryContractConfig,
            functionName: "register",
            args: [verifierParams, false],
        }, {
          onError: (error) => {
            console.error("Error writing contract:", error);
          }
        });

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

    constructRequest();
  }, [zkPassport, revealContry]);

  const { address } = zkPassport.getSolidityVerifierDetails("ethereum_sepolia");
  console.log("Verifier contract address:", address);

  return (<Container>
    <h1>Get Verified</h1>
    <Typography variant="body1" gutterBottom>
      To get verified, please scan the QR code below with your ZKPassport app and follow the instructions.
    </Typography>
    <Typography variant="body1" gutterBottom>
      You can reveal your country of citizenship by checking the box below. This is optional. However, doing so will enable you to participate in country-specific forums.
    </Typography>
    <Checkbox checked={revealContry} onClick={(e) => setRevealCountry((v) => !v)} disabled={verifyPhase != "PRE_SCAN"} />
    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {verifyUrl ? (
        <>
          <QRCodeSVG value={verifyUrl} size={256} level="L" />
          
            {
              verifyPhase === "PRE_SCAN" ? (
                <Typography variant="body1" gutterBottom>
                  Scan the QR code with your ZKPassport app to begin verification.
                </Typography>
              ) : verifyPhase === "GENERATING_PROOF" ? (
                <Stack>
                  <Typography variant="body1" gutterBottom>
                    Generating your proof, please wait...
                  </Typography>
                  <CircularProgress />
                </Stack>
              ) : verifyPhase === "PROOF_GENERATED" ? (
                <Typography variant="body1" gutterBottom>
                  Proof generated! Verifying on-chain...
                </Typography>
              ) : verifyPhase === "VERIFIED" ? (
                <Typography variant="body1" gutterBottom>
                  You have been successfully verified!
                </Typography>
              ) : verifyPhase === "REJECTED" ? (
                <Typography variant="body1" gutterBottom>
                  Verification rejected. Please try again.
                </Typography>
              ) : verifyPhase === "ERROR" ? (
                <Typography variant="body1" gutterBottom>
                  An error occurred during verification. Please try again.
                </Typography>
              ) : null
            }
          
        </>
      ) : null}
    </Box>
  </Container>);
};

export default GetVerified;
