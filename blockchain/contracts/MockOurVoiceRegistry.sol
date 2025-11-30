// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./Constants.sol";
import "./IZKPassportVerifier.sol";
import "./IOurVoiceRegistry.sol";
import "./StringUtils.sol";


contract MockOurVoiceRegistry is AOurVoiceRegistry {

    function register(string memory nationality) external returns (bytes32) {
        bytes32 userId = keccak256(abi.encode(msg.sender));
        return _registerHelper(userId, nationality);
    }
}