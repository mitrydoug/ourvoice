// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./IZKRegistry.sol";

contract ZKRegistry is IZKRegistry {

    struct Registration {
        bytes32 uniqueIdentifier; // Unique identifier (e.g., hash of government ID)
        DiscosedData disclosedData; // Information disclosed in the proof
        uint256 registrationTimestamp; // Timestamp of registration
    }

    IZKPassportVerifier public zkPassportVerifier;
    string public constant scope;
    string public constant domain;
    uint256 public constant registrationValidityPeriod = 365 days;

    // Map users to their registrations and verified unique identifiers
    mapping(address => Registration) public userRegistrations;

    constructor(string memory scope, string memory domain, address _verifierAddress) {
        scope = scope;
        domain = domain;
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(ProofVerificationParams calldata params, bool isIDCard) external returns (bytes32) {
        // Verify the proof
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        require(verified, "Proof is invalid");

        // Check the proof was generated using your domain name (scope) and the subscope
        // you specified
        require(
          zkPassportVerifier.verifyScopes(params.publicInputs, domain, scope),
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

        // Use the getBoundData function to get the data bound to the proof
        BoundData memory boundData = zkPassportVerifier.getBoundData(params);
        // Make sure the user's address is the one that is calling the contract
        require(boundData.userAddress == msg.sender, "Not the expected sender");
        // Make sure the chain id is the same as the one you specified in the query builder
        require(boundData.chainId == block.chainid, "Invalid chain id");
        // If you didn't specify any custom data, make sure the string is empty
        require(bytes(boundData.customData).length == 0, "Custom data should be empty");

        // Store the unique identifier
        userRegistrations[msg.sender] = Registration(uniqueIdentifier, disclosedData, block.timestamp);

        return userRegistrations[msg.sender].uniqueIdentifier;
    }

    function isRegistered(address user) public view returns (bool) {
        return userRegistrations[user].uniqueIdentifier != bytes32(0) && 
               block.timestamp <= userRegistrations[user].registrationTimestamp + registrationValidityPeriod;
    }

    function getUserRegistration(address user) external view returns (Registration memory) {
        require(isRegistered(user), "User is not registered or registration has expired");
        return userIdentifiers[user];
    }
}