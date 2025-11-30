// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./Constants.sol";
import "./StringUtils.sol";


struct Registration {
    bytes32 uniqueIdentifier; // Unique identifier (e.g., hash of government ID)
    string nationality; // User's nationality or "" if not disclosed
    address[] registeredAddresses; // Addresses associated with this unique identifier
}

abstract contract AOurVoiceRegistry {

    // Map users to their registrations and verified unique identifiers
    mapping(address => bytes32) public userIdFromAddress;
    mapping(bytes32 => Registration) public userRegistrations;

    function _registerHelper(bytes32 userId, string memory nationality) internal returns (bytes32) {

        Registration storage registration = userRegistrations[userId];
        if (registration.uniqueIdentifier == NO_USER) {
            registration.uniqueIdentifier = userId;
        }

        if (StringUtils.isEmpty(registration.nationality)) {
            registration.nationality = nationality;
        } else if (!StringUtils.isEmpty(nationality)) {
            require(StringUtils.equals(registration.nationality, nationality), "A registration may not switch nationalities");
        }

        if (userIdFromAddress[msg.sender] == NO_USER) {
            userIdFromAddress[msg.sender] = userId;
            registration.registeredAddresses.push(msg.sender);
        }

        return userId;
    }

    function isRegistered(address _userAddress) public view returns (bool) {
        return userRegistrations[userIdFromAddress[_userAddress]].uniqueIdentifier != NO_USER;
    }

    function getUserIdentifier(address _userAddress) external view returns (bytes32) {
        require(isRegistered(_userAddress), "User is not registered");
        return userRegistrations[userIdFromAddress[_userAddress]].uniqueIdentifier;
    }

    function getUserRegistration(address _userAddress) external view returns (Registration memory) {
        require(isRegistered(_userAddress), "User is not registered");
        return userRegistrations[userIdFromAddress[_userAddress]];
    }
}