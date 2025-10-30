// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./IZKRegistry.sol";

import "hardhat/console.sol";

contract ZKRegistry is IZKRegistry {

    IZKPassportVerifier public zkPassportVerifier;
    string public scope;
    string public domain;
    uint256 public constant registrationValidityPeriod = 365 days;

    // Map users to their registrations and verified unique identifiers
    mapping(address => Registration) public userRegistrations;
    mapping(bytes32 => address) public identifierToAddress;

    constructor(string memory _scope, string memory _domain, address _verifierAddress) {
        scope = _scope;
        domain = _domain;
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(ProofVerificationParams calldata params) external returns (bytes32) {
        // Verify the proof
        console.log("Verifying proof for user:", msg.sender);
        console.log(block.timestamp);
        (bool verified, bytes32 uniqueIdentifier) = zkPassportVerifier.verifyProof(params);
        console.log("Proof verified:", verified);
        require(verified, "Proof is invalid");
        console.log("Unique Identifier:");

        // Check the proof was generated using your domain name (scope) and the subscope
        // you specified
        require(
          zkPassportVerifier.verifyScopes(params.proofVerificationData.publicInputs, domain, scope),
          "Invalid scope"
        );

        DisclosedData memory disclosedData = DisclosedData(
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            ""
        );


        if (identifierToAddress[uniqueIdentifier] != address(0)) {
            userRegistrations[msg.sender] = userRegistrations[identifierToAddress[uniqueIdentifier]];
            delete userRegistrations[identifierToAddress[uniqueIdentifier]];
            identifierToAddress[uniqueIdentifier] = msg.sender;
        } else {
            // Store the unique identifier
            userRegistrations[msg.sender] = Registration(uniqueIdentifier, disclosedData, block.timestamp);
            identifierToAddress[uniqueIdentifier] = msg.sender;
        }

        return userRegistrations[msg.sender].uniqueIdentifier;
    }

    function isRegistered(address user) public view returns (bool) {
        return userRegistrations[user].uniqueIdentifier != bytes32(0) && 
               block.timestamp <= userRegistrations[user].registrationTimestamp + registrationValidityPeriod;
    }

    function getUserRegistration(address user) external view returns (Registration memory) {
        require(isRegistered(user), "User is not registered or registration has expired");
        return userRegistrations[user];
    }

    function getUserIdentifier(address user) external view returns (bytes32) {
        require(isRegistered(user), "User is not registered or registration has expired");
        return userRegistrations[user].uniqueIdentifier;
    }
}