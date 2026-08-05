// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IRateLimiter.sol";

/// @title SponsorshipRateLimiter
/// @notice Per-human, leaky-bucket rate limiter for gas-sponsored actions.
/// @dev Immutable by design. All bucket parameters are fixed at construction and
///      the set of authorized callers is frozen after a single `initialize` call.
///      There is no owner, admin, pause, or upgrade path: changing the topology
///      (new Forum/Registry set or new parameters) requires a fresh deployment.
///
///      Model — linear leaky bucket in WAD (1e18) fixed-point:
///        usageNow      = max(0, usageLast - leakPerSecond * (now - updatedAt))
///        consume(a):   usageNow += a * WAD; revert RateLimited if usageNow > capacity
///
///      Usage is WAD-scaled so a constant integer leak rate still has sub-unit
///      resolution. A "unit" is one weight point charged by a caller (e.g. one
///      statement or one registration), so `capacity` is the maximum burst of
///      weighted actions and `leakPerSecond` is the steady-state refill rate.
///
///      Buckets are keyed by `bytes32 userId` — the zkPassport unique identifier
///      from SymvoliaRegistry — so a human shares one budget across registration
///      and every forum, regardless of how many addresses they control.
contract SponsorshipRateLimiter is IRateLimiter {
    /// @dev Fixed-point scale for bucket usage.
    uint256 private constant WAD = 1e18;

    error OnlyDeployer();
    error AlreadyInitialized();
    error NotInitialized();
    error NoCallers();
    error CapacityTooLarge();
    error NotAuthorized(address caller);
    error RateLimited(bytes32 userId);

    /// @notice Maximum sustained burst, in WAD-scaled units.
    uint256 public immutable capacity;
    /// @notice Steady-state drain, in WAD-scaled units per second.
    uint256 public immutable leakPerSecond;
    /// @notice The only address permitted to call `initialize`, set at deploy time.
    address public immutable deployer;

    /// @notice True once `initialize` has run; the authorized-caller set is then frozen.
    bool public initialized;
    /// @notice Contracts permitted to call `consume` (Forum instances, Registry).
    mapping(address => bool) public isAuthorized;

    /// @dev One storage slot: 128 + 64 bits used.
    struct Bucket {
        uint128 usage; // WAD-scaled current usage as of `updatedAt`
        uint64 updatedAt; // unix seconds of the last consume
    }

    mapping(bytes32 => Bucket) private _buckets;

    /// @param capacityUnits    Whole-unit burst capacity (e.g. 20 => 20 weight-1 actions).
    /// @param leakUnitsPerDay  Whole units drained per day, converted to a per-second rate.
    constructor(uint256 capacityUnits, uint256 leakUnitsPerDay) {
        uint256 _capacity = capacityUnits * WAD;
        // Usage is stored as uint128 and is always <= capacity, so capacity must fit.
        if (_capacity > type(uint128).max) revert CapacityTooLarge();

        capacity = _capacity;
        leakPerSecond = (leakUnitsPerDay * WAD) / 1 days;
        deployer = msg.sender;
    }

    /// @notice One-time registration of the contracts allowed to meter usage.
    /// @dev Callable exactly once, only by the deployer. Resolves the circular
    ///      dependency where Forum/Registry take this limiter as an immutable
    ///      constructor argument (so they cannot be known at our construction).
    ///      After this call the caller set is permanently frozen.
    function initialize(address[] calldata callers) external {
        if (msg.sender != deployer) revert OnlyDeployer();
        if (initialized) revert AlreadyInitialized();
        if (callers.length == 0) revert NoCallers();

        for (uint256 i = 0; i < callers.length; i++) {
            isAuthorized[callers[i]] = true;
        }
        initialized = true;
    }

    modifier onlyAuthorized() {
        if (!initialized) revert NotInitialized();
        if (!isAuthorized[msg.sender]) revert NotAuthorized(msg.sender);
        _;
    }

    /// @inheritdoc IRateLimiter
    function consume(bytes32 userId, uint256 amount) external onlyAuthorized {
        uint256 usage = _decayedUsage(_buckets[userId]) + amount * WAD;
        if (usage > capacity) revert RateLimited(userId);
        // Safe cast: usage <= capacity <= type(uint128).max (checked at construction).
        _buckets[userId] = Bucket(uint128(usage), uint64(block.timestamp));
    }

    /// @notice True if charging `amount` units to `userId` right now would revert.
    /// @dev Read-only mirror of `consume` for the sponsorship webhook to pre-check.
    function wouldExceed(
        bytes32 userId,
        uint256 amount
    ) external view returns (bool) {
        return _decayedUsage(_buckets[userId]) + amount * WAD > capacity;
    }

    /// @notice Current WAD-scaled usage for `userId` after applying decay.
    function usageOf(bytes32 userId) external view returns (uint256) {
        return _decayedUsage(_buckets[userId]);
    }

    /// @dev Usage after applying the linear leak since `updatedAt`, floored at zero.
    function _decayedUsage(Bucket memory b) private view returns (uint256) {
        uint256 leaked = leakPerSecond * (block.timestamp - b.updatedAt);
        return b.usage > leaked ? b.usage - leaked : 0;
    }
}
