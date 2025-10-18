// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";

struct Registration {
    bytes32 uniqueIdentifier; // Unique identifier (e.g., hash of government ID)
    DisclosedData disclosedData; // Information disclosed in the proof
    uint256 registrationTimestamp; // Timestamp of registration
}

interface IZKRegistry {

    function register(ProofVerificationParams calldata params, bool isIDCard) external returns (bytes32);
    function isRegistered(address user) external view returns (bool);
    function getUserRegistration(address user) external view returns (Registration memory);

}