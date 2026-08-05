// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";

import {SponsorshipRateLimiter} from "./SponsorshipRateLimiter.sol";

contract SponsorshipRateLimiterTest is Test {
    uint256 constant WAD = 1e18;
    uint256 constant BASE_TIMESTAMP = 1_000_000;

    // capacity = 10 units; leak = 86400 units/day => exactly 1 unit/second.
    uint256 constant CAPACITY_UNITS = 10;
    uint256 constant LEAK_UNITS_PER_DAY = 86_400;

    bytes32 constant ALICE = keccak256("alice");
    bytes32 constant BOB = keccak256("bob");

    SponsorshipRateLimiter limiter;

    function setUp() public {
        vm.warp(BASE_TIMESTAMP);
        limiter = new SponsorshipRateLimiter(
            CAPACITY_UNITS,
            LEAK_UNITS_PER_DAY
        );

        address[] memory callers = new address[](1);
        callers[0] = address(this); // this test contract acts as an authorized caller
        limiter.initialize(callers);
    }

    // --- construction ---------------------------------------------------------

    function testConstructorSetsParameters() external view {
        assertEq(limiter.capacity(), CAPACITY_UNITS * WAD, "capacity");
        assertEq(limiter.leakPerSecond(), WAD, "1 unit/second");
        assertEq(limiter.deployer(), address(this), "deployer");
        assertTrue(limiter.initialized(), "initialized");
    }

    function testConstructorRejectsOversizeCapacity() external {
        // capacityUnits * WAD must fit in uint128.
        uint256 tooBig = uint256(type(uint128).max);
        vm.expectRevert(SponsorshipRateLimiter.CapacityTooLarge.selector);
        new SponsorshipRateLimiter(tooBig, LEAK_UNITS_PER_DAY);
    }

    // --- initialization / authorization --------------------------------------

    function testInitializeOnlyDeployer() external {
        SponsorshipRateLimiter fresh = new SponsorshipRateLimiter(
            CAPACITY_UNITS,
            LEAK_UNITS_PER_DAY
        );
        address[] memory callers = new address[](1);
        callers[0] = address(this);

        vm.prank(address(0xBEEF));
        vm.expectRevert(SponsorshipRateLimiter.OnlyDeployer.selector);
        fresh.initialize(callers);
    }

    function testInitializeIsOneTime() external {
        address[] memory callers = new address[](1);
        callers[0] = address(this);

        vm.expectRevert(SponsorshipRateLimiter.AlreadyInitialized.selector);
        limiter.initialize(callers);
    }

    function testInitializeRejectsEmptyCallers() external {
        SponsorshipRateLimiter fresh = new SponsorshipRateLimiter(
            CAPACITY_UNITS,
            LEAK_UNITS_PER_DAY
        );
        address[] memory callers = new address[](0);

        vm.expectRevert(SponsorshipRateLimiter.NoCallers.selector);
        fresh.initialize(callers);
    }

    function testConsumeBeforeInitializeReverts() external {
        SponsorshipRateLimiter fresh = new SponsorshipRateLimiter(
            CAPACITY_UNITS,
            LEAK_UNITS_PER_DAY
        );
        vm.expectRevert(SponsorshipRateLimiter.NotInitialized.selector);
        fresh.consume(ALICE, 1);
    }

    function testUnauthorizedCallerReverts() external {
        vm.prank(address(0xBEEF));
        vm.expectRevert(
            abi.encodeWithSelector(
                SponsorshipRateLimiter.NotAuthorized.selector,
                address(0xBEEF)
            )
        );
        limiter.consume(ALICE, 1);
    }

    // --- weighted consume -----------------------------------------------------

    function testConsumeIsWadScaled() external {
        limiter.consume(ALICE, 1);
        assertEq(limiter.usageOf(ALICE), WAD, "1 unit == 1 WAD");
    }

    function testWeightedConsumeAccumulates() external {
        limiter.consume(ALICE, 3);
        limiter.consume(ALICE, 2);
        assertEq(limiter.usageOf(ALICE), 5 * WAD, "3 + 2 units");
    }

    function testBucketsAreIndependentPerUser() external {
        limiter.consume(ALICE, 4);
        limiter.consume(BOB, 1);
        assertEq(limiter.usageOf(ALICE), 4 * WAD, "alice");
        assertEq(limiter.usageOf(BOB), 1 * WAD, "bob");
    }

    function testConsumeUpToCapacitySucceeds() external {
        limiter.consume(ALICE, CAPACITY_UNITS); // exactly at capacity
        assertEq(limiter.usageOf(ALICE), CAPACITY_UNITS * WAD, "at capacity");
    }

    function testConsumeOverCapacityReverts() external {
        limiter.consume(ALICE, CAPACITY_UNITS);
        vm.expectRevert(
            abi.encodeWithSelector(
                SponsorshipRateLimiter.RateLimited.selector,
                ALICE
            )
        );
        limiter.consume(ALICE, 1);
    }

    function testSingleOversizeConsumeReverts() external {
        vm.expectRevert(
            abi.encodeWithSelector(
                SponsorshipRateLimiter.RateLimited.selector,
                ALICE
            )
        );
        limiter.consume(ALICE, CAPACITY_UNITS + 1);
    }

    // --- decay over time ------------------------------------------------------

    function testUsageLeaksLinearly() external {
        limiter.consume(ALICE, CAPACITY_UNITS); // 10 units at t0
        vm.warp(block.timestamp + 3); // 1 unit/sec => 3 units leaked
        assertEq(limiter.usageOf(ALICE), 7 * WAD, "10 - 3 leaked");
    }

    function testLeakEnablesFurtherConsume() external {
        limiter.consume(ALICE, CAPACITY_UNITS); // full
        vm.warp(block.timestamp + 4); // leak 4 => usage 6
        limiter.consume(ALICE, 4); // back to 10, still ok
        assertEq(limiter.usageOf(ALICE), CAPACITY_UNITS * WAD, "refilled");
    }

    function testUsageFloorsAtZero() external {
        limiter.consume(ALICE, CAPACITY_UNITS);
        vm.warp(block.timestamp + 100 days); // far more than capacity worth of leak
        assertEq(limiter.usageOf(ALICE), 0, "floored at zero");
    }

    // --- wouldExceed mirrors consume -----------------------------------------

    function testWouldExceedFalseThenConsumeSucceeds() external {
        limiter.consume(ALICE, CAPACITY_UNITS - 1); // usage 9
        assertFalse(limiter.wouldExceed(ALICE, 1), "9 + 1 == capacity");
        limiter.consume(ALICE, 1); // does not revert
    }

    function testWouldExceedTrueThenConsumeReverts() external {
        limiter.consume(ALICE, CAPACITY_UNITS); // usage 10
        assertTrue(limiter.wouldExceed(ALICE, 1), "would exceed");
        vm.expectRevert(
            abi.encodeWithSelector(
                SponsorshipRateLimiter.RateLimited.selector,
                ALICE
            )
        );
        limiter.consume(ALICE, 1);
    }

    function testWouldExceedAccountsForDecay() external {
        limiter.consume(ALICE, CAPACITY_UNITS); // full
        assertTrue(limiter.wouldExceed(ALICE, 1), "full now");
        vm.warp(block.timestamp + 2); // leak 2 => usage 8
        assertFalse(limiter.wouldExceed(ALICE, 2), "8 + 2 == capacity");
        assertTrue(limiter.wouldExceed(ALICE, 3), "8 + 3 > capacity");
    }
}
