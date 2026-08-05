// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IZKPassportVerifier.sol";
import "./ISymvoliaRegistry.sol";
import "./IRateLimiter.sol";
import "./Constants.sol";
import "./StringUtils.sol";

contract SymvoliaRegistry is ASymvoliaRegistry {
    error DevProofsNotAllowed();
    error ProofInvalid();
    error AddressAlreadyRegistered(address user, bytes32 existingId);
    error InvalidScope(string expectedDomain, string expectedScope);

    IZKPassportVerifier public zkPassportVerifier;
    string public scope;
    string public domain;
    // uint256 public constant registrationValidityPeriod = 365 days;
    bool public devMode;

    /// @notice Rate limiter that meters gas-sponsored registrations per human.
    IRateLimiter public immutable rateLimiter;

    // Rate-limit weight charged per sponsored registration, in whole limiter
    // units. Only `registerSponsored` consumes budget; the self-funded
    // `register` path is unmetered.
    uint256 public constant REGISTRATION_WEIGHT = 5;

    constructor(
        string memory _scope,
        string memory _domain,
        address _verifierAddress,
        bool _devMode,
        IRateLimiter _rateLimiter
    ) {
        scope = _scope;
        domain = _domain;
        devMode = _devMode;
        zkPassportVerifier = IZKPassportVerifier(_verifierAddress);
        rateLimiter = _rateLimiter;
    }

    /// @notice Register using the caller's own gas. Unmetered — does not consume
    ///         the human's rate-limit budget.
    function register(
        ProofVerificationParams calldata _params
    ) external returns (bytes32) {
        return _verifyAndRegister(_params);
    }

    /// @notice Gas-sponsored registration: same as `register`, but additionally
    ///         charges the human's per-human rate-limit budget.
    /// @dev This is the ONLY registration entrypoint the sponsorship webhook
    ///      approves. The weight is a fixed on-chain constant, so the webhook
    ///      can reproduce it exactly for its pre-flight check.
    function registerSponsored(
        ProofVerificationParams calldata _params
    ) external returns (bytes32) {
        bytes32 _userId = _verifyAndRegister(_params);

        // Meter this sponsored registration against the human's shared budget.
        // The user id is derived on-chain from the verified proof, never
        // supplied by the caller.
        rateLimiter.consume(_userId, REGISTRATION_WEIGHT);

        return _userId;
    }

    function _verifyAndRegister(
        ProofVerificationParams calldata _params
    ) internal returns (bytes32) {
        if (!devMode && _params.serviceConfig.devMode)
            revert DevProofsNotAllowed();
        // Verify the proof
        (
            bool verified,
            bytes32 uniqueIdentifier,
            IZKPassportHelper helper
        ) = zkPassportVerifier.verify(_params);
        if (!verified) revert ProofInvalid();

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

        // Get the disclosed data to retrieve the nationality
        DisclosedData memory disclosedData = helper.getDisclosedData(
            _params.committedInputs,
            false
        );

        return _registerHelper(uniqueIdentifier, disclosedData.nationality);
    }
}
