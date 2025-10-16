// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";

contract IdRegistry {

    IZKPassportVerifier public zkPassportVerifier;
    string public constant MY_SCOPE = "our-voice-verify";

    // Map users to their verified unique identifiers
    mapping(address => bytes32) public userIdentifiers;

    constructor(address _verifierAddress) {
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(ProofVerificationParams calldata params, bool isIDCard) public returns (bytes32) {
        // Verify the proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        require(verified, "Proof is invalid");

        // Check the proof was generated using your domain name (scope) and the subscope
        // you specified
        require(
          zkPassportVerifier.verifyScopes(params.publicInputs, "your-domain.com", MY_SCOPE),
          "Invalid scope"
        );

        // Check if the user is at least 18 years old
        bool isAgeAboveOrEqual = zkPassportVerifier.isAgeAboveOrEqual(
          18,
          params
        );

        // Get the disclosed data to retrieve the nationality
        DisclosedData memory disclosedData = zkPassportVerifier.getDisclosedData(
          params,
          isIDCard
        );
        // Alpha 3 code of the nationality (e.g. FRA, USA, etc.)
        string memory nationality = disclosedData.nationality;

        // Use the getBoundData function to get the data bound to the proof
        BoundData memory boundData = zkPassportVerifier.getBoundData(params);
        // Make sure the user's address is the one that is calling the contract
        require(boundData.userAddress == msg.sender, "Not the expected sender");
        // Make sure the chain id is the same as the one you specified in the query builder
        require(boundData.chainId == block.chainid, "Invalid chain id");
        // If you didn't specify any custom data, make sure the string is empty
        require(bytes(boundData.customData).length == 0, "Custom data should be empty");

        // Store the unique identifier
        userIdentifiers[msg.sender] = uniqueIdentifier;

        return uniqueIdentifier;
    }

}