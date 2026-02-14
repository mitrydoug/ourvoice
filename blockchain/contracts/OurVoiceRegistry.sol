// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./IOurVoiceRegistry.sol";
import "./Constants.sol";
import "./StringUtils.sol";

import "hardhat/console.sol";

contract OurVoiceRegistry is AOurVoiceRegistry {
    error DevProofsNotAllowed();
    error ProofInvalid();
    error AddressAlreadyRegistered(address user, bytes32 existingId);
    error InvalidScope(string expectedDomain, string expectedScope);
    error UserTooYoung(uint requiredAge);

    IZKPassportVerifier public zkPassportVerifier;
    string public scope;
    string public domain;
    // uint256 public constant registrationValidityPeriod = 365 days;
    bool public devMode;

    constructor(
        string memory _scope,
        string memory _domain,
        address _verifierAddress,
        bool _devMode
    ) {
        scope = _scope;
        domain = _domain;
        devMode = _devMode;
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
    }

    function register(
        ProofVerificationParams calldata _params
    ) external returns (bytes32) {
        if (!devMode && _params.serviceConfig.devMode)
            revert DevProofsNotAllowed();
        // Verify the proof
        console.log("Verifying proof for user:", msg.sender);
        (
            bool verified,
            bytes32 uniqueIdentifier,
            IZKPassportHelper helper
        ) = zkPassportVerifier.verify(_params);
        console.log("Proof verified:", verified);
        if (!verified) revert ProofInvalid();
        console.log("Unique Identifier:");
        console.log("Scope:", scope);
        console.log("Domain:", domain);

        if (userIdFromAddress[msg.sender] != NO_USER) {
            if (userIdFromAddress[msg.sender] != uniqueIdentifier)
                revert AddressAlreadyRegistered(
                    msg.sender,
                    userIdFromAddress[msg.sender]
                );
        }

        // Check the proof was generated using your domain name (scope) and the subscope
        // you specified
        if (
            !helper.verifyScopes(
                _params.proofVerificationData.publicInputs,
                domain,
                scope
            )
        ) revert InvalidScope(domain, scope);

        bool isAgeAboveOrEqual = helper.isAgeAboveOrEqual(
            18,
            _params.committedInputs
        );

        if (!isAgeAboveOrEqual) revert UserTooYoung(18);

        // Get the disclosed data to retrieve the nationality
        DisclosedData memory disclosedData = helper.getDisclosedData(
            _params.committedInputs,
            false
        );

        return _registerHelper(uniqueIdentifier, disclosedData.nationality);
    }
}
