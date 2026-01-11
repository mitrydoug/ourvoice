// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {console} from "forge-std/console.sol";

import {Forum} from "./Forum.sol";
import {MockOurVoiceRegistry} from "./MockOurVoiceRegistry.sol";
import {AOurVoiceRegistry} from "./IOurVoiceRegistry.sol";

// Test harness to expose internal methods for testing
contract ForumHarness is Forum {
    constructor(
        AOurVoiceRegistry _ourVoiceRegistry,
        string memory _nationality,
        uint _maxRankedStatements
    ) Forum(_ourVoiceRegistry, _nationality, _maxRankedStatements) {}

    function exposed_costOfUserSupport(
        int _userSupport
    ) external pure returns (uint) {
        return _costOfUserSupport(_userSupport);
    }

    function exposed_userSupportedStatements(
        bytes32 userId
    ) external view returns (uint[] memory) {
        return _userSupportedStatements[userId];
    }
}

contract ForumTest is Test {
    uint MOCK_TEST_TIMESTAMP = 1767572846;

    MockOurVoiceRegistry mockRegistry;
    ForumHarness forum;

    function setUp() public {
        vm.warp(MOCK_TEST_TIMESTAMP);
        mockRegistry = new MockOurVoiceRegistry();
        forum = new ForumHarness(mockRegistry, "", 0);
    }

    modifier registeredMember() {
        mockRegistry.register("");
        _;
    }

    function _getStatementById(
        uint _statementId
    ) internal view returns (Forum.Statement memory) {
        uint[] memory statementIds = new uint[](1);
        statementIds[0] = _statementId;
        Forum.Statement[] memory statements = forum.getStatementsById(
            statementIds
        );
        return statements[0];
    }

    function _addStatementSupport(uint _statementId, int _value) internal {
        Forum.SupportAdjustment[]
            memory adjustments = new Forum.SupportAdjustment[](1);
        adjustments[0] = Forum.SupportAdjustment({
            statementId: _statementId,
            value: _value
        });
        forum.adjustSupport(adjustments);
    }

    function testIsMemberNotRegistered() external view {
        assertFalse(
            forum.isMember(),
            "deployer should not be member before registration"
        );
    }

    function testRegistration() external registeredMember {
        assertTrue(
            forum.isMember(),
            "deployer should be member after registration"
        );
    }

    function testInitialUserBalance() external registeredMember {
        uint balance = forum.getUserBalance();
        // TODO: fix my constants management
        assertEq(balance, 1050, "Initial user balance should be 1050 credits");
    }

    function testUserBalanceAllowance() external registeredMember {
        uint initialBalance = forum.getUserBalance();
        // TODO: assumes step length
        vm.warp(vm.getBlockTimestamp() + 4 hours);
        uint newBalance = forum.getUserBalance();
        assertEq(
            newBalance,
            initialBalance + 25,
            "User balance should increase by 25 credits after 4 hours"
        );
        vm.warp(vm.getBlockTimestamp() + 20 hours);
        newBalance = forum.getUserBalance();
        assertEq(
            newBalance,
            initialBalance + 150,
            "User balance should increase by 150 credits after 1 day"
        );
    }

    function testAddStatement() external registeredMember {
        forum.addStatement("Hello, world!");
        assertEq(
            forum.statementCount(),
            1,
            "Forum should have 1 statement after addition"
        );

        Forum.Statement memory _statement = _getStatementById(0);
        assertEq(
            _statement.text,
            "Hello, world!",
            "Statement content should match"
        );
        assertEq(_statement.support, 0, "Initial support should be 0");
        assertEq(_statement.rank, -1, "Initial rank should be -1");
    }

    function testAddStatementSupport() external registeredMember {
        forum.addStatement("Hello, world!");
        _addStatementSupport(0, 1);

        Forum.Statement memory statement = _getStatementById(0);
        assertEq(statement.support, 1, "Support should be incremented to 1");
    }

    // ======================================================================
    // Section 1: Tests about adjusting statement support and its effect on ranking
    // ======================================================================

    function testSupportOfOneDoesNotCauseRanking() external registeredMember {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 1);

        Forum.Statement memory statement = _getStatementById(0);
        assertEq(statement.support, 1, "Support should be 1");
        assertEq(statement.rank, -1, "Statement should not be ranked");
        assertEq(forum.rankedCount(), 0, "Ranked count should be 0");
    }

    function testSupportGreaterThanOneCausesRanking()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 2);

        Forum.Statement memory statement = _getStatementById(0);
        assertEq(statement.support, 2, "Support should be 2");
        assertEq(statement.rank, 0, "Statement should be ranked at position 0");
        assertEq(forum.rankedCount(), 1, "Ranked count should be 1");
    }

    function testRankedStatementRankChangesWithMoreSupport()
        external
        registeredMember
    {
        // Create and rank two statements
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        _addStatementSupport(0, 3); // Rank 0
        _addStatementSupport(1, 2); // Rank 1

        // Verify initial rankings
        assertEq(_getStatementById(0).rank, 0, "Statement A should be rank 0");
        assertEq(_getStatementById(1).rank, 1, "Statement B should be rank 1");

        // Add more support to Statement B to overtake Statement A
        _addStatementSupport(1, 2); // Now has 4 support total

        // Verify rankings changed
        assertEq(
            _getStatementById(0).rank,
            1,
            "Statement A should now be rank 1"
        );
        assertEq(
            _getStatementById(1).rank,
            0,
            "Statement B should now be rank 0"
        );
        assertEq(
            _getStatementById(1).support,
            4,
            "Statement B should have 4 support"
        );
    }

    function testRankedStatementRankDoesNotChangeWithSameSupport()
        external
        registeredMember
    {
        // Create and rank two statements
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        _addStatementSupport(0, 5); // Rank 0
        _addStatementSupport(1, 3); // Rank 1

        // Add support to B but not enough to overtake A
        _addStatementSupport(1, 1); // Now has 4 support total, still less than A

        // Verify rankings didn't change
        assertEq(
            _getStatementById(0).rank,
            0,
            "Statement A should still be rank 0"
        );
        assertEq(
            _getStatementById(1).rank,
            1,
            "Statement B should still be rank 1"
        );
    }

    function testRemovingSupportLowersRank() external registeredMember {
        // Create and rank three statements
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        forum.addStatement("Statement C");
        _addStatementSupport(0, 5); // Rank 0
        _addStatementSupport(1, 4); // Rank 1
        _addStatementSupport(2, 3); // Rank 2

        // Remove support from Statement A
        _addStatementSupport(0, -3); // Now has 2 support

        // A should now be rank 2
        assertEq(
            _getStatementById(0).rank,
            2,
            "Statement A should now be rank 2"
        );
        assertEq(
            _getStatementById(1).rank,
            0,
            "Statement B should now be rank 0"
        );
        assertEq(
            _getStatementById(2).rank,
            1,
            "Statement C should now be rank 1"
        );
    }

    function testRemovingSupportToOneRemovesFromRanking()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 3); // Gets ranked

        assertEq(_getStatementById(0).rank, 0, "Statement should be ranked");
        assertEq(forum.rankedCount(), 1, "Ranked count should be 1");

        // Remove support down to 1 (below ranking threshold of 2)
        _addStatementSupport(0, -2);

        Forum.Statement memory statement = _getStatementById(0);
        assertEq(statement.support, 1, "Support should be 1");
        assertEq(statement.rank, -1, "Statement should not be ranked");
        assertEq(forum.rankedCount(), 0, "Ranked count should be 0");
    }

    function testRemovingSupportDoesNotChangeRankIfStillAboveOthers()
        external
        registeredMember
    {
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        _addStatementSupport(0, 10); // Rank 0
        _addStatementSupport(1, 3); // Rank 1

        // Remove some support from A but it still has more than B
        _addStatementSupport(0, -4); // Now has 6 support

        assertEq(
            _getStatementById(0).rank,
            0,
            "Statement A should still be rank 0"
        );
        assertEq(
            _getStatementById(1).rank,
            1,
            "Statement B should still be rank 1"
        );
        assertEq(
            _getStatementById(0).support,
            6,
            "Statement A should have 6 support"
        );
    }

    // ======================================================================
    // Section 2: Tests about user balance and cost of support adjustments
    // ======================================================================

    function testUserBalanceDecreasesWhenAddingSupport()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        uint initialBalance = forum.getUserBalance();

        _addStatementSupport(0, 3); // Cost should be 6 (triangular number)

        uint newBalance = forum.getUserBalance();
        assertEq(
            newBalance,
            initialBalance - 6,
            "Balance should decrease by 6 for 3 units of support"
        );
    }

    function testUserBalanceIncreasesWhenRemovingSupport()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 5); // Cost: 15
        uint balanceAfterAdding = forum.getUserBalance();

        _addStatementSupport(0, -2); // Refund cost of going from 5 to 3: 15 - 6 = 9

        uint finalBalance = forum.getUserBalance();
        assertEq(
            finalBalance,
            balanceAfterAdding + 9,
            "Balance should increase by 9 when removing 2 units from 5"
        );
    }

    function testCannotAddSupportWithInsufficientBalance()
        external
        registeredMember
    {
        forum.addStatement("Test statement");

        // Spend most of the balance
        uint currentBalance = forum.getUserBalance();
        _addStatementSupport(0, 44); // Cost: 990

        currentBalance = forum.getUserBalance();
        // Try to add more support than balance allows
        vm.expectRevert("Insufficient credits for support adjustments");
        _addStatementSupport(0, 10); // Would cost 1485 - 990 = 495, but only ~60 credits left
    }

    function testCostIsTriangularNumber() external view {
        // Verify cost formula: cost(n) = n(n+1)/2
        assertEq(
            forum.exposed_costOfUserSupport(0),
            0,
            "Cost of 0 should be 0"
        );
        assertEq(
            forum.exposed_costOfUserSupport(1),
            1,
            "Cost of 1 should be 1"
        );
        assertEq(
            forum.exposed_costOfUserSupport(2),
            3,
            "Cost of 2 should be 3"
        );
        assertEq(
            forum.exposed_costOfUserSupport(3),
            6,
            "Cost of 3 should be 6"
        );
        assertEq(
            forum.exposed_costOfUserSupport(4),
            10,
            "Cost of 4 should be 10"
        );
        assertEq(
            forum.exposed_costOfUserSupport(5),
            15,
            "Cost of 5 should be 15"
        );
        assertEq(
            forum.exposed_costOfUserSupport(10),
            55,
            "Cost of 10 should be 55"
        );
        assertEq(
            forum.exposed_costOfUserSupport(100),
            5050,
            "Cost of 100 should be 5050"
        );
    }

    function testNegativeSupportCostSameAsPositive() external view {
        // Verify negative support has same cost as positive
        assertEq(
            forum.exposed_costOfUserSupport(-5),
            forum.exposed_costOfUserSupport(5),
            "Cost of -5 should equal cost of 5"
        );
        assertEq(
            forum.exposed_costOfUserSupport(-10),
            forum.exposed_costOfUserSupport(10),
            "Cost of -10 should equal cost of 10"
        );
    }

    function testMarginalCostIsCorrect() external registeredMember {
        forum.addStatement("Test statement");

        // The marginal cost of the (n+1)th unit is n+1
        // When going from n to n+1, the cost change is:
        // triangular(n+1) - triangular(n) = (n+1)(n+2)/2 - n(n+1)/2 = (n+1)

        uint initialBalance = forum.getUserBalance();
        _addStatementSupport(0, 1); // Marginal cost: 1
        assertEq(
            forum.getUserBalance(),
            initialBalance - 1,
            "First unit should cost 1"
        );

        uint balance2 = forum.getUserBalance();
        _addStatementSupport(0, 1); // Marginal cost: 2
        assertEq(
            forum.getUserBalance(),
            balance2 - 2,
            "Second unit should cost 2"
        );

        uint balance3 = forum.getUserBalance();
        _addStatementSupport(0, 1); // Marginal cost: 3
        assertEq(
            forum.getUserBalance(),
            balance3 - 3,
            "Third unit should cost 3"
        );
    }

    function testMultipleSupportAdjustmentsInOneTransaction()
        external
        registeredMember
    {
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        forum.addStatement("Statement C");

        uint initialBalance = forum.getUserBalance();

        // Adjust support for multiple statements at once
        Forum.SupportAdjustment[]
            memory adjustments = new Forum.SupportAdjustment[](3);
        adjustments[0] = Forum.SupportAdjustment({statementId: 0, value: 3});
        adjustments[1] = Forum.SupportAdjustment({statementId: 1, value: 5});
        adjustments[2] = Forum.SupportAdjustment({statementId: 2, value: 2});
        forum.adjustSupport(adjustments);

        // Total cost should be 6 + 15 + 3 = 24
        uint newBalance = forum.getUserBalance();
        assertEq(
            newBalance,
            initialBalance - 24,
            "Balance should decrease by total cost of all adjustments"
        );

        // Verify all statements have correct support
        assertEq(
            _getStatementById(0).support,
            3,
            "Statement A should have 3 support"
        );
        assertEq(
            _getStatementById(1).support,
            5,
            "Statement B should have 5 support"
        );
        assertEq(
            _getStatementById(2).support,
            2,
            "Statement C should have 2 support"
        );
    }

    // ======================================================================
    // Section 3: Tests related to decay of support over time
    // ======================================================================

    function testStatementSupportDecaysOverTime() external registeredMember {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 10);

        int supportBefore = _getStatementById(0).support;
        assertEq(supportBefore, 10, "Initial support should be 100");

        // Advance by 4 steps
        vm.warp(vm.getBlockTimestamp() + 4 * 4 hours);

        int supportAfter4Steps = _getStatementById(0).support;
        assertEq(supportAfter4Steps, 9, "Support should decay over time");

        // Advance another 96 steps
        vm.warp(vm.getBlockTimestamp() + 96 * 4 hours);

        int supportAfter100Steps = _getStatementById(0).support;
        assertEq(supportAfter100Steps, 2, "Support should decay over time");
    }

    function testAdjustingSupportAccountsForDecay() external registeredMember {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 10);

        // Advance time to cause decay
        vm.warp(vm.getBlockTimestamp() + 10 * 4 hours);

        // The statement's support has decayed, but adding more should work correctly
        int supportBeforeAdjustment = _getStatementById(0).support;
        _addStatementSupport(0, 5);

        int finalSupport = _getStatementById(0).support;
        // Final support should be approximately decayed value + 5
        assertEq(
            finalSupport,
            supportBeforeAdjustment + 5,
            "Support adjustment should be added to decayed value"
        );
    }

    function testRankingUpdatedAfterSupportDecay() external registeredMember {
        // Create two statements with different support levels
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        _addStatementSupport(0, 20); // High initial support
        _addStatementSupport(1, 10); // Lower initial support

        assertEq(
            _getStatementById(0).rank,
            0,
            "Statement A should initially be rank 0"
        );
        assertEq(
            _getStatementById(1).rank,
            1,
            "Statement B should initially be rank 1"
        );

        // Wait 2x42 steps for significant decay
        // A = 20 -> 10
        // B = 10 -> 5
        vm.warp(vm.getBlockTimestamp() + 42 * 4 hours);

        // Trigger ranking update by adjusting support on B
        _addStatementSupport(1, 6);

        assertEq(
            _getStatementById(1).rank,
            0,
            "Statement B should now be rank 0"
        );
        assertEq(
            _getStatementById(0).rank,
            1,
            "Statement A should now be rank 1"
        );
    }

    function testUserStatementSupportDecaysOverTime()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 10);

        // Check user's support immediately
        Forum.StatementSupport[] memory userSupport = forum
            .getUserStatementSupport();
        assertEq(
            userSupport.length,
            1,
            "User should have 1 supported statement"
        );
        assertEq(userSupport[0].support, 10, "User support should be 10");

        // Advance time by 4 steps
        vm.warp(vm.getBlockTimestamp() + 4 * 4 hours);

        // Check user's support after decay
        userSupport = forum.getUserStatementSupport();
        assertEq(
            userSupport.length,
            1,
            "User should still have 1 supported statement"
        );
        assertEq(
            userSupport[0].support,
            9,
            "User support should have decayed to 9"
        );

        // Advance time by another 96 steps
        vm.warp(vm.getBlockTimestamp() + 96 * 4 hours);

        // Check user's support after decay
        userSupport = forum.getUserStatementSupport();
        assertEq(
            userSupport.length,
            1,
            "User should still have 1 supported statement"
        );
        assertEq(
            userSupport[0].support,
            2,
            "User support should have decayed to 2"
        );
    }

    function testUserBalanceAccountsForSupportDecay()
        external
        registeredMember
    {
        forum.addStatement("Test statement");

        uint initialBalance = forum.getUserBalance();
        _addStatementSupport(0, 10); // Cost: 55

        uint balanceAfterSupport = forum.getUserBalance();
        assertEq(
            balanceAfterSupport,
            initialBalance - 55,
            "Balance should decrease by 55"
        );

        // Advance time to cause support decay
        vm.warp(vm.getBlockTimestamp() + 42 * 4 hours);

        // User's support has decayed to ~5, which costs 15 instead of 55
        // When they remove all support, they should get back only the cost of current support
        _addStatementSupport(0, -5); // Current support is ~5, removing it should refund ~15

        uint finalBalance = forum.getUserBalance();
        // The refund should be approximately 15 (cost of ~5 support)
        // Plus the time-based allowance
        uint expectedTimeAllowance = 42 * 25;

        assertEq(
            finalBalance,
            balanceAfterSupport + 15 + expectedTimeAllowance,
            "Balance should increase by decayed support cost plus time allowance"
        );
    }

    function testStatementsFallOffUserSupportListWhenSupportDecaysToZero()
        external
        registeredMember
    {
        forum.addStatement("Test statement");
        _addStatementSupport(0, 10);

        // Verify statement is in user's support list
        Forum.StatementSupport[] memory userSupport = forum
            .getUserStatementSupport();
        assertEq(
            userSupport.length,
            1,
            "User should have 1 supported statement"
        );
        assertEq(userSupport[0].statementId, 0, "Statement ID should be 0");
        assertEq(userSupport[0].support, 10, "User support should be 10");

        // Wait long enough for support to decay to 0 (168 steps = 4 half-lives)
        // 10 -> 5 -> 2 -> 1 -> 0
        vm.warp(vm.getBlockTimestamp() + 168 * 4 hours);

        // Check that the statement is no longer in user's support list
        userSupport = forum.getUserStatementSupport();
        assertEq(
            userSupport.length,
            0,
            "User should have no supported statements after decay to 0"
        );
    }

    function testLowestRankStatementIsEvictedWhenMaxRankedStatementsExceeded()
        external
    {
        // Create a forum with a low max ranked statements limit for testing
        ForumHarness testForum = new ForumHarness(mockRegistry, "", 3);

        // Register and create statements
        mockRegistry.register("");

        testForum.addStatement("Statement A");
        testForum.addStatement("Statement B");
        testForum.addStatement("Statement C");
        testForum.addStatement("Statement D");

        // Add support to fill up the ranking
        Forum.SupportAdjustment[]
            memory adjustments = new Forum.SupportAdjustment[](3);
        adjustments[0] = Forum.SupportAdjustment({statementId: 0, value: 5});
        adjustments[1] = Forum.SupportAdjustment({statementId: 1, value: 4});
        adjustments[2] = Forum.SupportAdjustment({statementId: 2, value: 3});
        testForum.adjustSupport(adjustments);

        // Verify we have 3 ranked statements
        assertEq(testForum.rankedCount(), 3, "Should have 3 ranked statements");
        assertEq(
            testForum.getRankedStatement(0).id,
            0,
            "Statement A should be rank 0"
        );
        assertEq(
            testForum.getRankedStatement(1).id,
            1,
            "Statement B should be rank 1"
        );
        assertEq(
            testForum.getRankedStatement(2).id,
            2,
            "Statement C should be rank 2"
        );

        // Now add high support to Statement D, which should evict Statement C (lowest rank)
        Forum.SupportAdjustment[]
            memory adjustment = new Forum.SupportAdjustment[](1);
        adjustment[0] = Forum.SupportAdjustment({statementId: 3, value: 6});
        testForum.adjustSupport(adjustment);

        // Verify we still have 3 ranked statements
        assertEq(
            testForum.rankedCount(),
            3,
            "Should still have 3 ranked statements"
        );

        // Verify Statement D is now ranked
        assertEq(
            testForum.getRankedStatement(0).id,
            3,
            "Statement D should be rank 0"
        );
        assertEq(
            testForum.getRankedStatement(1).id,
            0,
            "Statement A should be rank 1"
        );
        assertEq(
            testForum.getRankedStatement(2).id,
            1,
            "Statement B should be rank 2"
        );

        // Verify Statement C was evicted (rank should be -1)
        uint[] memory statementIds = new uint[](1);
        statementIds[0] = 2;
        Forum.Statement[] memory statements = testForum.getStatementsById(
            statementIds
        );
        assertEq(
            statements[0].rank,
            -1,
            "Statement C should no longer be ranked"
        );
        assertEq(
            statements[0].support,
            3,
            "Statement C should still have 3 support"
        );
    }

    // ======================================================================
    // Section 4: Tests for userSupportedStatements maintenance
    // ======================================================================

    function testNewItemsAreAddedToFirstEmptySlot() external registeredMember {
        // Create multiple statements
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        forum.addStatement("Statement C");
        forum.addStatement("Statement D");

        // Support statements A, B, and C
        _addStatementSupport(0, 10);
        _addStatementSupport(1, 10);
        _addStatementSupport(2, 10);

        // Remove all support from B (creating an empty slot)
        _addStatementSupport(1, -10);

        // Now add support to statement D
        // It should reuse the empty slot where B was (index 1)
        _addStatementSupport(3, 5);

        // Verify the final state by checking the order of returned statements
        // If D reused B's slot, the order should be A (index 0), D (index 1), C (index 2)
        Forum.StatementSupport[] memory userSupport = forum
            .getUserStatementSupport();
        assertEq(
            userSupport.length,
            3,
            "User should have 3 supported statements (A, C, D)"
        );

        // Check that statements are returned in order A, D, C
        assertEq(
            userSupport[0].statementId,
            0,
            "First statement should be A (index 0)"
        );
        assertEq(
            userSupport[0].support,
            10,
            "Statement A should have 10 support"
        );

        assertEq(
            userSupport[1].statementId,
            3,
            "Second statement should be D (reusing B's slot at index 1)"
        );
        assertEq(
            userSupport[1].support,
            5,
            "Statement D should have 5 support"
        );

        assertEq(
            userSupport[2].statementId,
            2,
            "Third statement should be C (index 2)"
        );
        assertEq(
            userSupport[2].support,
            10,
            "Statement C should have 10 support"
        );
    }

    function testArrayCompactsWhenTwoEmptySlotsExist()
        external
        registeredMember
    {
        // Create 5 statements: A, B, C, D, E
        forum.addStatement("Statement A");
        forum.addStatement("Statement B");
        forum.addStatement("Statement C");
        forum.addStatement("Statement D");
        forum.addStatement("Statement E");

        // Support all 5 statements - array will be [A, B, C, D, E]
        _addStatementSupport(0, 10);
        _addStatementSupport(1, 10);
        _addStatementSupport(2, 10);
        _addStatementSupport(3, 10);
        _addStatementSupport(4, 10);

        // Verify we have 5 statements
        Forum.StatementSupport[] memory userSupport = forum
            .getUserStatementSupport();
        assertEq(userSupport.length, 5, "Should have 5 supported statements");

        // Get userId for raw array length checks
        bytes32 userId = keccak256(abi.encode(address(this)));

        // Check initial length
        uint initialLength = forum
            .exposed_userSupportedStatements(userId)
            .length;
        assertEq(initialLength, 5, "Initial raw array length should be 5");

        // Remove support from B (creating one empty slot at index 1)
        _addStatementSupport(1, -10);

        // Remove support from C (creating second empty slot at index 2)
        // This triggers compaction: last occupied element (E at index 4) moves to index 2, array pops
        _addStatementSupport(2, -10);

        // Verify that raw array length reduced by 1 due to compaction
        uint lengthAfterRemovals = forum
            .exposed_userSupportedStatements(userId)
            .length;
        assertEq(
            lengthAfterRemovals,
            4,
            "Raw array length should reduce from 5 to 4 when creating two empty slots triggers compaction"
        );

        // Now add support to a new statement F
        // F fills the first empty slot; no further compaction occurs
        forum.addStatement("Statement F");
        _addStatementSupport(5, 5);

        // Verify array length stays at 4 (F just filled an empty slot)
        uint lengthAfterF = forum
            .exposed_userSupportedStatements(userId)
            .length;
        assertEq(
            lengthAfterF,
            4,
            "Raw array length should stay at 4 after F fills the first empty slot"
        );

        // Verify the array compacted and is now [A, F, E, D]
        userSupport = forum.getUserStatementSupport();
        assertEq(
            userSupport.length,
            4,
            "Array should have compacted to 4 statements"
        );

        // Check the order: A, F, E, D
        assertEq(userSupport[0].statementId, 0, "Index 0 should be A");
        assertEq(
            userSupport[1].statementId,
            5,
            "Index 1 should be F (filled first empty slot)"
        );
        assertEq(
            userSupport[2].statementId,
            4,
            "Index 2 should be E (moved from index 4 to second empty slot)"
        );
        assertEq(userSupport[3].statementId, 3, "Index 3 should be D");
    }
}
