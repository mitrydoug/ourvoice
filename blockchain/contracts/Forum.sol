// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IOurVoiceRegistry.sol";
import "./StringUtils.sol";
import "./DecayUtils.sol";

contract Forum {

    // Maximum length (in chars) of a statement
    uint public constant MAX_STATEMENT_LENGTH = 120;
    // Amount of credits a user is credited each "step"
    uint public constant USER_CREDIT_ALLOWANCE_PER_STEP = 25;
    // We only track this many statements for ranking purposes
    uint public constant MAX_RANKED_STATEMENTS = 1000;
    uint public constant MIN_STATEMENT_SUPPORT_TO_RANK = 1;

    AOurVoiceRegistry public ourVoiceRegistry;

    struct SupportAdjustment {
        uint statementId;
        int value;
    }

    struct Support {
        int value;
        uint lastUpdated;
    }

    struct Statement {
        uint id;
        string text;
        uint createdTimestamp;
        Support support;
        uint rank;
    }

    // number of statements in the forum
    uint public statementCount;
    // statement ID -> Statement
    mapping(uint => Statement) public statements;


    // rank -> statement ID
    uint[] public statementRankings;
    // number of ranked statements
    uint public rankedCount; 

    mapping(bytes32 => mapping(uint => Support)) public userSupport;

    struct UserBalance {
        uint credits;
        uint lastUpdated;
    }

    mapping(bytes32 => UserBalance) public userCredits;

    // Membership criteria
    string public nationality;

    event StatementAdded(uint indexed id, string statement);
    event StatementVote(uint indexed id, int voteCount);

    constructor(AOurVoiceRegistry _ourVoiceRegistry, string memory _nationality) {
        ourVoiceRegistry = _ourVoiceRegistry;
        nationality = _nationality;
    }

    function getRankedStatement(
        uint _rank
    ) external view returns (Statement memory) {
        require(_rank < statementCount, "Rank is larger than statement count");
        return statements[statementRankings[_rank]];
    }

    function getRankedStatementsPage(
        uint _start,
        uint _limit
    ) external view returns (Statement[] memory) {
        require(_start <= statementCount, "Start is larger than statement count");

        uint _length = _start + _limit <= statementCount ? _limit : statementCount - _start;

        Statement[] memory rankedStatements = new Statement[](_length);
        for (uint i = 0; i < _length; i++) {
            rankedStatements[i] = statements[statementRankings[_start + i]];
        }
        return rankedStatements;
    }

    function getStatementsById(
        uint[] calldata _statementIds
    ) external view returns (Statement[] memory) {
        Statement[] memory stmts = new Statement[](_statementIds.length);
        for (uint i = 0; i < _statementIds.length; i++) {
            uint stmtId = _statementIds[i];
            require(stmtId < statementCount, "Invalid statement ID");
            stmts[i] = statements[stmtId];
        }
        return stmts;
    }

    function isMember() public view returns (bool) {
        if (!ourVoiceRegistry.isRegistered(msg.sender)) {
            return false;
        }
        if (bytes(nationality).length == 0) {
            return true;
        }
        Registration memory registration = ourVoiceRegistry.getUserRegistration(msg.sender);
        return StringUtils.equals(registration.nationality, nationality);
    }

    modifier onlyMembers() {
        require(isMember(), "Only members can perform this action");
        _;
    }

    function _rankingMaintenance() internal {
        if (rankedCount == 0) {
            return;
        }
        if (_getCurrentSupportValue(statementRankings[rankedCount - 1].support) < MIN_STATEMENT_SUPPORT_TO_RANK) {
            // perform a binary search to find the new rankedCount
            uint low = 0;
            uint high = rankedCount - 1;
            while (low <= high) {
                uint mid = (low + high) / 2;
                if (_getCurrentSupportValue(statements[statementRankings[mid]].support) < MIN_STATEMENT_SUPPORT_TO_RANK) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
        }
    }

    function _getRankingThreshold() internal view returns (int) {
        if (statementCount < MAX_RANKED_STATEMENTS) {
            return MIN_STATEMENT_SUPPORT_TO_RANK;
        }
        uint _lowestRankedStatementId = statementRankings[statementCount - 1];
        return statements[_lowestRankedStatementId].support.supportValue;
    }


    function _updateStatementRanking(uint _statementId) internal {

        Statement memory statement = statements[_stmtId];
        uint _stmtRank = statement.rank;
        int _voteCount = statement.voteCount;



        while (true) {
            // check if we should bubble up
            if (_stmtRank > 0) {
                int _prevVoteCount = statements[
                    statementRankings[_stmtRank - 1]
                ].voteCount;
                if (_voteCount > _prevVoteCount) {
                    uint _otherRank = _stmtRank - 1;
                    statementRankings[_stmtRank] = statements[
                        statementRankings[_otherRank]
                    ].id;
                    statements[statementRankings[_otherRank]].rank = _stmtRank;
                    statementRankings[_otherRank] = statement.id;
                    _stmtRank = _otherRank;
                    continue;
                }
            }
            // check if we should bubble down
            if (_stmtRank + 1 < statementCount) {
                int _succVoteCount = statements[
                    statementRankings[_stmtRank + 1]
                ].voteCount;
                if (_voteCount < _succVoteCount) {
                    uint _otherRank = _stmtRank + 1;
                    statementRankings[_stmtRank] = statements[
                        statementRankings[_otherRank]
                    ].id;
                    statements[statementRankings[_otherRank]].rank = _stmtRank;
                    statementRankings[_otherRank] = statement.id;
                    _stmtRank = _otherRank;
                    continue;
                }
            }
            break; // no more swaps needed
        }
        statements[_stmtId].rank = _stmtRank;
    }

    function addStatement(string calldata _statement) external onlyMembers {
        require(
            bytes(_statement).length <= MAX_STATEMENT_LENGTH,
            "Statement exceeds maximum length"
        );

        // Ensure the statement is not empty
        // check for duplicate statements if necessary
        // may want to do some rate-limiting here
        statements[statementCount] = Statement({
            id: statementCount,
            text: _statement,
            createdTimestamp: block.timestamp
        });

        emit StatementAdded(statementCount, _statement);
        statementCount++;
    }

    function getUserVoteSet() external view onlyMembers returns (Vote[] memory) {
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);
        return userVoteSets[userId];
    }

    function _updateUserBalanceToBeCurrent(UserBalance storage _balance) internal view {
        uint _elapsedSteps = ellapsedStepsBetweenTimestamps(
            _balance.lastUpdated,
            block.timestamp
        );
        if (_elapsedSteps > 0) {
            _balance.credits += _elapsedSteps * USER_CREDIT_ALLOWANCE_PER_STEP;
            _balance.lastUpdated = block.timestamp;
        }
    }

    function _getCurrentSupportValue(Support storage _support) internal view returns (int) {
        return DecayUtils.decayValue(
            _support.value,
            _support.lastUpdated,
            block.timestamp
        );
    }

    function _updateSupportToBeCurrent(Support storage _support) internal view {
        _support.value = DecayUtils.decayValue(
            _support.value,
            _support.lastUpdated,
            block.timestamp
        );
        _support.lastUpdated = block.timestamp;
    }

    function _costOfUserSupport(int _userSupport) public pure returns (uint) {
        uint absSupport = uint(_userSupport >= 0 ? _userSupport : -_userSupport);
        return (absSupport * (absSupport + 1)) / 2;
    }

    function adjustSupport(SupportAdjustment[] calldata _supportAdjustments) public {
        require(ourVoiceRegistry.isRegistered(msg.sender), "User is not registered");
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);

        UserBalance storage _userBalance = userCredits[userId];
        _updateUserBalanceToBeCurrent(_userBalance);

        int _totalCostChange = 0;
        
        for (uint i = 0; i < _supportAdjustments.length; i++) {
            SupportAdjustment memory _adjustment = _supportAdjustments[i];
            require(_adjustment.statementId < statementCount, "Invalid statement ID");

            Support storage _currentStatementSupport = statements[_adjustment.statementId].support;
            Support storage _currentUserSupport = userSupport[userId][_adjustment.statementId];
            _updateSupportToBeCurrent(_currentStatementSupport);
            _updateSupportToBeCurrent(_currentUserSupport);

            uint _oldCost = _costOfUserSupport(_currentSupport.supportValue);
            uint _newCost = _costOfUserSupport(_currentSupport.supportValue + _adjustment.value);
            _totalCostChange += int(_newCost) - int(_oldCost);

            _currentStatementSupport.supportValue += _adjustment.value;
            _currentUserSupport.supportValue += _adjustment.value;

            _updateStatementRanking(_adjustment.statementId);
        }

        require(
            int(_userBalance.credits) >= _totalCostChange,
            "Insufficient credits for support adjustments"
        );
        _userBalance.credits = uint(int(_userBalance.credits) - _totalCostChange);
    }

    fallback() external {}
}
