import React, { FC, useEffect, useMemo, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ZKPassport, ProofResult } from "@zkpassport/sdk";
import { Box } from "@mui/material";

const MY_ICON_URL = "https://i.imgur.com/I86xH4n.png";
const MY_SCOPE = "our-voice-verify";

export const GetVerified: FC = () => {
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);

  const zkPassport = useMemo(() => new ZKPassport(), []);

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
      } = queryBuilder
        // Verify the user's age is greater than or equal to 18
        .gte("age", 18)
        .disclose("nationality")
        // Bind to the chain where the proof will be verified
        .bind("chain", "ethereum_sepolia")
        // Finalize the query
        .done();

      let proof: ProofResult;

      // Use the proofResult from the onProofGenerated callback to get the proof
      onProofGenerated((proofResult) => {
        console.log("Proof generated:", proofResult);
        proof = proofResult;
      });

      onResult(async ({ uniqueIdentifier, verified, result }) => {
        console.log("Result received:", uniqueIdentifier, verified, result);

        if (!verified) {
          // If the proof is not verified, save yourself some gas and return straight away
          console.log("Proof is not verified");
          return;
        }

        // Get the verification parameters
        const verifierParams = zkPassport.getSolidityVerifierParameters({
          proof: proof,
          // Use the same scope as the one you specified with the request function
          scope: "my-scope",
          // Enable dev mode if you want to use mock passports, otherwise keep it false
          devMode: false,
        });

        // Verify the proof on-chain
        // The function is defined in the next steps below
        await verifyOnChain(
          verifierParams,
          walletProvider,
          // Use the document type to determine if the proof is for an ID card or passport
          result.document_type.disclose.result !== "passport",
        );
      });

      onRequestReceived(() => {
        console.log("Request received");
      });

      onGeneratingProof(() => {
        console.log("Generating proof...");
      });

      onReject(() => {
        console.log("Rejected");
      });

      onError((error) => {
        console.error("Error:", error);
      });

      setVerifyUrl(url);
    };

    constructRequest();
  }, [zkPassport]);

  return (<Box>
    {verifyUrl ? <QRCodeSVG value={verifyUrl} size={256} level="L" /> : null}
  </Box>);
};

export default GetVerified;
