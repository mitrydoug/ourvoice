// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @title IRateLimiter
/// @notice The minimal surface a metered contract (Forum, Registry) depends on.
/// @dev Callers pass a `userId` derived on-chain from the acting address and a
///      fixed policy `amount` (weight). Never pass user-supplied values.
interface IRateLimiter {
    /// @notice Record `amount` units of sponsored work for `userId`.
    /// @dev Reverts if the charge would push the user over their burst budget.
    function consume(bytes32 userId, uint256 amount) external;
}
