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
    // Starting credits for a new user, one week of allowance
    uint public constant USER_STARTING_CREDITS = 1050;
    // We only track this many statements for ranking purposes
    uint public constant MAX_RANKED_STATEMENTS = 1000;
    int public constant MIN_STATEMENT_SUPPORT_TO_RANK = 2;

    AOurVoiceRegistry public ourVoiceRegistry;

    struct SupportAdjustment {
        uint statementId;
        int value;
    }

    struct StatementSupport {
        uint statementId;
        int support;
    }

    struct Support {
        int value;
        uint lastUpdated;
    }

    struct StatementImpl {
        uint id;
        string text;
        uint createdTimestamp;
        Support support;
        int rank;
    }

    struct Statement {
        uint id;
        string text;
        uint createdTimestamp;
        int support;
        int rank;
    }

    // number of statements in the forum
    uint public statementCount;
    // statement ID -> StatementImpl
    mapping(uint => StatementImpl) public statements;

    // rank -> statement ID
    uint[] public statementRankings;
    // number of ranked statements
    uint public rankedCount;

    mapping(bytes32 => mapping(uint => Support)) public userSupportMap;
    mapping(bytes32 => uint[]) public userSupportedStatements;

    struct UserBalance {
        uint credits;
        uint lastUpdated;
    }

    mapping(bytes32 => UserBalance) public userCredits;

    // Membership criteria
    string public nationality;

    event StatementAdded(uint indexed id, string statement);

    constructor(
        AOurVoiceRegistry _ourVoiceRegistry,
        string memory _nationality
    ) {
        ourVoiceRegistry = _ourVoiceRegistry;
        nationality = _nationality;
    }

    function _resolveStatement(
        uint _statementId
    ) internal view returns (Statement memory) {
        StatementImpl memory _statement = statements[_statementId];
        int currentSupport = _getCurrentSupportValue(_statement.support);
        int currentRank = _getStatementRank(_statement);
        return
            Statement({
                id: _statement.id,
                text: _statement.text,
                createdTimestamp: _statement.createdTimestamp,
                support: currentSupport,
                rank: currentRank
            });
    }

    function _getStatementRank(StatementImpl memory _statement) internal view returns (int) {
        return _statement.rank < int(rankedCount) ? _statement.rank : -1;
    }

    function getRankedStatement(
        uint _rank
    ) external view returns (Statement memory) {
        require(_rank < rankedCount, "Rank is larger than statement count");
        return _resolveStatement(statementRankings[_rank]);
    }

    function getRankedStatementsPage(
        uint _start,
        uint _limit
    ) external view returns (Statement[] memory) {
        require(
            _start <= statementCount,
            "Start is larger than statement count"
        );

        uint _length = _start + _limit <= rankedCount
            ? _limit
            : rankedCount - _start;

        Statement[] memory rankedStatements = new Statement[](_length);
        for (uint i = 0; i < _length; i++) {
            rankedStatements[i] = _resolveStatement(
                statementRankings[_start + i]
            );
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
            stmts[i] = _resolveStatement(stmtId);
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
        Registration memory registration = ourVoiceRegistry.getUserRegistration(
            msg.sender
        );
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
        if (
            _getCurrentSupportValue(
                statements[statementRankings[rankedCount - 1]].support
            ) < MIN_STATEMENT_SUPPORT_TO_RANK
        ) {
            // perform a binary search to find the new rankedCount
            uint low = 0;
            uint high = rankedCount - 1;
            while (low < high) {
                uint mid = (low + high) / 2;
                if (
                    _getCurrentSupportValue(
                        statements[statementRankings[mid]].support
                    ) < MIN_STATEMENT_SUPPORT_TO_RANK
                ) {
                    high = mid;
                } else {
                    low = mid + 1;
                }
            }
            rankedCount = low;
        }
    }

    function _getRankingThreshold() internal view returns (int) {
        if (rankedCount < MAX_RANKED_STATEMENTS) {
            return MIN_STATEMENT_SUPPORT_TO_RANK;
        }
        uint _lowestRankedStatementId = statementRankings[rankedCount - 1];
        return
            _getCurrentSupportValue(
                statements[_lowestRankedStatementId].support
            ) + 1;
    }

    function _updateStatementRanking(uint _statementId) internal {
        _rankingMaintenance();
        StatementImpl memory statement = statements[_statementId];

        uint _rank;
        if (_getStatementRank(statement) != -1) {
            _rank = uint(statement.rank);
        } else {

            int _rankingThreshold = _getRankingThreshold();
            
            if (_getCurrentSupportValue(statement.support) < _rankingThreshold) {
                return;
            }

            if (rankedCount < MAX_RANKED_STATEMENTS) {
                _rank = rankedCount;
                rankedCount += 1;
            } else {
                _rank = rankedCount - 1;
            }

            if (statementRankings.length == _rank) {
                statementRankings.push();
            }
        }

        while (
            _rank >= 1 &&
            _getCurrentSupportValue(statement.support) >
                _getCurrentSupportValue(
                    statements[statementRankings[_rank - 1]].support
                )
        ) {
            statementRankings[_rank] = statementRankings[_rank - 1];
            statements[statementRankings[_rank]].rank = int(_rank);
            _rank -= 1;
        }

        while (
            _rank + 1 < rankedCount &&
            _getCurrentSupportValue(statement.support) <
                _getCurrentSupportValue(
                    statements[statementRankings[_rank + 1]].support
                )
        ) {
            statementRankings[_rank] = statementRankings[_rank + 1];
            statements[statementRankings[_rank]].rank = int(_rank);
            _rank += 1;
        }

        statementRankings[_rank] = _statementId;
        statements[_statementId].rank = int(_rank);
    }

    function addStatement(string calldata _statementText) external onlyMembers {
        require(
            bytes(_statementText).length <= MAX_STATEMENT_LENGTH,
            "Statement exceeds maximum length"
        );

        // Ensure the statement is not empty
        // check for duplicate statements if necessary
        // may want to do some rate-limiting here
        statements[statementCount] = StatementImpl({
            id: statementCount,
            text: _statementText,
            createdTimestamp: block.timestamp,
            support: Support({value: 0, lastUpdated: block.timestamp}),
            rank: -1
        });

        emit StatementAdded(statementCount, _statementText);
        statementCount++;
    }

    function getUserBalance() external view onlyMembers returns (uint) {
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);
        UserBalance memory _balance = userCredits[userId];
        return _getCurrentUserBalance(_balance);
    }

    function getUserStatementSupport()
        external
        view
        onlyMembers
        returns (StatementSupport[] memory)
    {
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);

        uint _numSupported = 0;
        for (uint i = 0; i < userSupportedStatements[userId].length; i++) {
            uint statementId = userSupportedStatements[userId][i];
            Support storage support = userSupportMap[userId][statementId];
            if (_getCurrentSupportValue(support) != 0) {
                _numSupported++;
            }
        }

        StatementSupport[] memory supportedStatements = new StatementSupport[](
            _numSupported
        );
        for (uint i = 0; i < userSupportedStatements[userId].length; i++) {
            uint statementId = userSupportedStatements[userId][i];
            Support storage support = userSupportMap[userId][statementId];
            int currentSupport = _getCurrentSupportValue(support);
            if (currentSupport != 0) {
                supportedStatements[i] = StatementSupport({
                    statementId: statementId,
                    support: currentSupport
                });
            }
        }
        return supportedStatements;
    }

    function _getCurrentUserBalance(
        UserBalance memory _balance
    ) internal view returns (uint) {
        if (_balance.lastUpdated == 0) {
            _balance.credits = USER_STARTING_CREDITS;
            _balance.lastUpdated = ourVoiceRegistry
                .getUserRegistration(msg.sender)
                .registrationTimestamp;
        }

        uint _elapsedSteps = DecayUtils.ellapsedStepsBetweenTimestamps(
            _balance.lastUpdated,
            block.timestamp
        );
        return
            _balance.credits + (_elapsedSteps * USER_CREDIT_ALLOWANCE_PER_STEP);
    }

    function _updateUserBalanceToBeCurrent(
        UserBalance storage _balance
    ) internal {
        _balance.credits = _getCurrentUserBalance(_balance);
        _balance.lastUpdated = block.timestamp;
    }

    function _getCurrentSupportValue(
        Support memory _support
    ) internal view returns (int) {
        return
            DecayUtils.decayValue(
                _support.value,
                _support.lastUpdated,
                block.timestamp
            );
    }

    function _updateSupportToBeCurrent(Support storage _support) internal {
        _support.value = DecayUtils.decayValue(
            _support.value,
            _support.lastUpdated,
            block.timestamp
        );
        _support.lastUpdated = block.timestamp;
    }

    function _costOfUserSupport(int _userSupport) public pure returns (uint) {
        uint absSupport = uint(
            _userSupport >= 0 ? _userSupport : -_userSupport
        );
        return (absSupport * (absSupport + 1)) / 2;
    }

    function _updateUserSupportedStatements(
        bytes32 _userId,
        uint _statementId
    ) internal {
        int _firstEmptySlot = -1;
        int _secondEmptySlot = -1;
        int _lastOccupiedSlot = -1;
        for (uint i = 0; i < userSupportedStatements[_userId].length; i++) {
            uint _currStatementId = userSupportedStatements[_userId][i];
            if (
                _getCurrentSupportValue(
                    userSupportMap[_userId][_currStatementId]
                ) == 0
            ) {
                if (_firstEmptySlot == -1) {
                    _firstEmptySlot = int(i);
                } else if (_secondEmptySlot == -1) {
                    _secondEmptySlot = int(i);
                }
            } else {
                _lastOccupiedSlot = int(i);
            }
        }

        if (_firstEmptySlot == -1) {
            // no empty slots, just append
            userSupportedStatements[_userId].push(_statementId);
        } else {
            userSupportedStatements[_userId][
                uint(_firstEmptySlot)
            ] = _statementId;
        }

        if (
            _secondEmptySlot != -1 &&
            _lastOccupiedSlot != -1 &&
            _lastOccupiedSlot > _secondEmptySlot
        ) {
            userSupportedStatements[_userId][
                uint(_secondEmptySlot)
            ] = userSupportedStatements[_userId][uint(_lastOccupiedSlot)];
            userSupportedStatements[_userId].pop();
            if (
                uint(_lastOccupiedSlot) <
                userSupportedStatements[_userId].length
            ) {
                userSupportedStatements[_userId].pop();
            }
        }
    }

    function adjustSupport(
        SupportAdjustment[] calldata _supportAdjustments
    ) external onlyMembers {
        require(
            ourVoiceRegistry.isRegistered(msg.sender),
            "User is not registered"
        );
        bytes32 _userId = ourVoiceRegistry.getUserIdentifier(msg.sender);

        UserBalance storage _userBalance = userCredits[_userId];
        _updateUserBalanceToBeCurrent(_userBalance);

        int _totalCostChange = 0;

        for (uint i = 0; i < _supportAdjustments.length; i++) {
            SupportAdjustment memory _adjustment = _supportAdjustments[i];
            require(
                _adjustment.statementId < statementCount,
                "Invalid statement ID"
            );

            Support storage _currentStatementSupport = statements[
                _adjustment.statementId
            ].support;
            Support storage _currentUserSupport = userSupportMap[_userId][
                _adjustment.statementId
            ];
            _updateSupportToBeCurrent(_currentStatementSupport);
            _updateSupportToBeCurrent(_currentUserSupport);

            uint _oldCost = _costOfUserSupport(_currentUserSupport.value);
            uint _newCost = _costOfUserSupport(
                _currentUserSupport.value + _adjustment.value
            );
            _totalCostChange += int(_newCost) - int(_oldCost);

            _currentStatementSupport.value += _adjustment.value;
            _currentUserSupport.value += _adjustment.value;

            _updateUserSupportedStatements(_userId, _adjustment.statementId);

            _updateStatementRanking(_adjustment.statementId);
        }

        require(
            int(_userBalance.credits) >= _totalCostChange,
            "Insufficient credits for support adjustments"
        );
        _userBalance.credits = uint(
            int(_userBalance.credits) - _totalCostChange
        );
    }

    fallback() external {}
}
