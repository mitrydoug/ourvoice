// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

/// @title IGateKeeper — Membership oracle interface for OurVoice forums
/// @notice Any contract implementing this interface can serve as a membership
///         gate for a Forum. The Forum depends only on this interface, enabling
///         alternative implementations (nationality-based, allowlist-based,
///         token-gated, etc.) without modifying the Forum contract.
interface IGateKeeper {
    /// @notice Determine whether the given address qualifies as a forum member.
    /// @param account The address to check for membership.
    /// @return True if the address is a member, false otherwise.
    function isMember(address account) external view returns (bool);
}
