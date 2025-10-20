// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./IZKRegistry.sol";


contract MockZKRegistry is IZKRegistry {

    mapping(address => Registration) public userRegistrations;
    uint256 public registrationCount;

    function register(DisclosedData calldata disclosedData) external returns (bytes32) {
        bytes32 mockUniqueIdentifier = keccak256(abi.encode(msg.sender, disclosedData));
        userRegistrations[msg.sender] = Registration(mockUniqueIdentifier, disclosedData, block.timestamp);
        registrationCount += 1;
        return mockUniqueIdentifier;
    }

    function isRegistered(address user) public view returns (bool) {
        return userRegistrations[user].registrationTimestamp != 0;
    }

    function getUserIdentifier(address user) external view returns (bytes32) {
        require(isRegistered(user), "User is not registered");
        return userRegistrations[user].uniqueIdentifier;
    }

    function getUserRegistration(address user) external view returns (Registration memory) {
        require(isRegistered(user), "User is not registered");
        return userRegistrations[user];
    }

}