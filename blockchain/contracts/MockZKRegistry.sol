// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./IZKRegistry.sol";


contract MockZKRegistry is IZKRegistry {

    mapping(address => Registration) public userRegistrations;
    mapping(bytes32 => address) public identifierToAddress;

    function register(string memory nationality) external returns (bytes32) {
        bytes32 uniqueIdentifier = keccak256(abi.encode(msg.sender));

        DisclosedData memory disclosedData = DisclosedData(
            "",
            "",
            nationality,
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