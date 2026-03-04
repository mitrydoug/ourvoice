// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IOurVoiceRegistry.sol";
import "./StringUtils.sol";
import "./DecayUtils.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";

contract Forum is Multicall {
    // Custom errors
    error NotMember();
    error RankOutOfBounds(uint rank, uint rankedCount);
    error StartOutOfBounds(uint start, uint statementCount);
    error InvalidStatementId(uint statementId);
    error StatementTooLong(uint length, uint maxLength);
    error UserNotRegistered(address user);
    error InsufficientCredits(uint available, int required);
    error TimestampOrderInvalid(uint fromTimestamp, uint toTimestamp);
    error StaleStep(uint expected, uint actual);

    // Maximum length (in bytes) of a statement
    uint public immutable maxStatementLength;
    // Amount of credits a user is credited each "step"
    uint public immutable userCreditAllowancePerStep;
    // Starting credits for a new user
    uint public immutable userStartingCredits;
    // Minimum support required for a statement to be ranked
    int public immutable minStatementSupportToRank;
    // We only track this many statements for ranking purposes
    uint public immutable maxRankedStatements;
    // Duration of a single decay/credit step in seconds
    uint public immutable stepDurationSeconds;
    // Minimum seconds between StatementEngaged events for the same statement
    uint public immutable engagementWindowSeconds;

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
        int peakRank; // best (lowest) rank ever achieved; -1 if never ranked
        uint lastEngagementEventTimestamp;
    }

    struct Statement {
        uint id;
        string text;
        uint createdTimestamp;
        int support;
        int rank;
        int peakRank;
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
    mapping(bytes32 => uint[]) internal _userSupportedStatements;

    struct UserBalance {
        uint credits;
        uint lastUpdated;
    }

    mapping(bytes32 => UserBalance) public userCredits;

    // Membership criteria
    string public nationality;

    event StatementAdded(uint indexed id, string statement);
    event StatementRankChanged(
        uint indexed statementId,
        int previousRank,
        int newRank
    );
    event StatementEngaged(uint indexed statementId);

    constructor(
        AOurVoiceRegistry _ourVoiceRegistry,
        string memory _nationality,
        uint _maxRankedStatements,
        uint _stepDurationSeconds,
        uint _engagementWindowSeconds,
        uint _maxStatementLength,
        uint _userCreditAllowancePerStep,
        uint _userStartingCredits,
        int _minStatementSupportToRank
    ) {
        ourVoiceRegistry = _ourVoiceRegistry;
        nationality = _nationality;
        maxRankedStatements = _maxRankedStatements;
        stepDurationSeconds = _stepDurationSeconds;
        engagementWindowSeconds = _engagementWindowSeconds;
        maxStatementLength = _maxStatementLength;
        userCreditAllowancePerStep = _userCreditAllowancePerStep;
        userStartingCredits = _userStartingCredits;
        minStatementSupportToRank = _minStatementSupportToRank;
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
                rank: currentRank,
                peakRank: _statement.peakRank
            });
    }

    function _getStatementRank(
        StatementImpl memory _statement
    ) internal view returns (int) {
        return _statement.rank < int(rankedCount) ? _statement.rank : -1;
    }

    function getRankedStatement(
        uint _rank
    ) external view returns (Statement memory) {
        if (_rank >= rankedCount) revert RankOutOfBounds(_rank, rankedCount);
        return _resolveStatement(statementRankings[_rank]);
    }

    function getRankedStatementsPage(
        uint _start,
        uint _limit
    ) external view returns (Statement[] memory) {
        if (_start > statementCount)
            revert StartOutOfBounds(_start, statementCount);

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
            if (stmtId >= statementCount) revert InvalidStatementId(stmtId);
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
        if (!isMember()) revert NotMember();
        _;
    }

    function _rankingMaintenance() internal {
        while (
            rankedCount > 0 &&
            _getCurrentSupportValue(
                statements[statementRankings[rankedCount - 1]].support
            ) <
            minStatementSupportToRank
        ) {
            rankedCount -= 1;
            _setStatementRank(statementRankings[rankedCount], -1);
        }
    }

    function _getRankingThreshold() internal view returns (int) {
        if (rankedCount < maxRankedStatements) {
            return minStatementSupportToRank;
        }
        uint _lowestRankedStatementId = statementRankings[rankedCount - 1];
        return
            _getCurrentSupportValue(
                statements[_lowestRankedStatementId].support
            ) + 1;
    }

    /// @dev Sets a statement's rank and updates peakRank if this is the best rank achieved.
    ///      Emits StatementRankChanged when the effective rank actually changes.
    function _setStatementRank(uint _statementId, int _rank) internal {
        int previousRank = statements[_statementId].rank;
        statements[_statementId].rank = _rank;

        if (previousRank != _rank) {
            emit StatementRankChanged(_statementId, previousRank, _rank);
        }
        if (
            _rank >= 0 &&
            (_rank < statements[_statementId].peakRank ||
                statements[_statementId].peakRank == -1)
        ) {
            statements[_statementId].peakRank = _rank;
        }
    }

    function _updateStatementRanking(uint _statementId) internal {
        _rankingMaintenance();
        StatementImpl memory statement = statements[_statementId];

        uint _rank;
        if (_getStatementRank(statement) != -1) {
            _rank = uint(statement.rank);
        } else {
            int _rankingThreshold = _getRankingThreshold();

            if (
                _getCurrentSupportValue(statement.support) < _rankingThreshold
            ) {
                return;
            }

            if (rankedCount < maxRankedStatements) {
                _rank = rankedCount;
                rankedCount += 1;
            } else {
                _rank = rankedCount - 1;
                // Mark the evicted statement as unranked
                _setStatementRank(statementRankings[_rank], -1);
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
            _setStatementRank(statementRankings[_rank], int(_rank));
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
            _setStatementRank(statementRankings[_rank], int(_rank));
            _rank += 1;
        }

        // If the statement's support has fallen below the ranking threshold,
        // unrank it and compact the array.
        if (
            _getCurrentSupportValue(statement.support) <
            minStatementSupportToRank
        ) {
            rankedCount -= 1;
            _setStatementRank(_statementId, -1);
            return;
        }

        statementRankings[_rank] = _statementId;
        _setStatementRank(_statementId, int(_rank));
    }

    function addStatement(
        string calldata _statementText,
        int _initialSupport
    ) external onlyMembers returns (uint) {
        if (bytes(_statementText).length > maxStatementLength)
            revert StatementTooLong(
                bytes(_statementText).length,
                maxStatementLength
            );

        // Ensure the statement is not empty
        // check for duplicate statements if necessary
        // may want to do some rate-limiting here
        statements[statementCount] = StatementImpl({
            id: statementCount,
            text: _statementText,
            createdTimestamp: block.timestamp,
            support: Support({value: 0, lastUpdated: block.timestamp}),
            rank: -1,
            peakRank: -1,
            lastEngagementEventTimestamp: 0
        });

        if (_initialSupport != 0) {
            if (!ourVoiceRegistry.isRegistered(msg.sender))
                revert UserNotRegistered(msg.sender);
            bytes32 _userId = ourVoiceRegistry.getUserIdentifier(msg.sender);

            // Apply initial support to statement and user support map
            statements[statementCount].support.value = _initialSupport;
            userSupportMap[_userId][statementCount] = Support({
                value: _initialSupport,
                lastUpdated: block.timestamp
            });
            _updateUserSupportedStatements(_userId, statementCount);

            // Charge credits (old cost is 0 since this is a new statement)
            uint _cost = _costOfUserSupport(_initialSupport);
            UserBalance storage _userBalance = userCredits[_userId];
            _updateUserBalanceToBeCurrent(_userBalance);
            if (_userBalance.credits < _cost)
                revert InsufficientCredits(_userBalance.credits, int(_cost));
            _userBalance.credits -= _cost;
        }

        _updateStatementRanking(statementCount);
        emit StatementAdded(statementCount, _statementText);
        uint _id = statementCount;
        statementCount++;
        return _id;
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
        for (uint i = 0; i < _userSupportedStatements[userId].length; i++) {
            uint statementId = _userSupportedStatements[userId][i];
            Support storage support = userSupportMap[userId][statementId];
            if (_getCurrentSupportValue(support) != 0) {
                _numSupported++;
            }
        }

        StatementSupport[] memory supportedStatements = new StatementSupport[](
            _numSupported
        );
        for (uint i = 0; i < _userSupportedStatements[userId].length; i++) {
            uint statementId = _userSupportedStatements[userId][i];
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

    // ======================================================================
    // Step calculation and decay
    // ======================================================================

    function _elapsedStepsBetweenTimestamps(
        uint fromTimestamp,
        uint toTimestamp
    ) internal view returns (uint) {
        if (fromTimestamp > toTimestamp)
            revert TimestampOrderInvalid(fromTimestamp, toTimestamp);
        return
            (toTimestamp / stepDurationSeconds) -
            (fromTimestamp / stepDurationSeconds);
    }

    function _decayValue(
        int startValue,
        uint fromTimestamp,
        uint toTimestamp
    ) internal view returns (int) {
        uint elapsedSteps = _elapsedStepsBetweenTimestamps(
            fromTimestamp,
            toTimestamp
        );

        if (startValue == 0 || elapsedSteps == 0) {
            return startValue;
        }

        return
            DecayUtils.approxDecayHalvingEvery42Steps(startValue, elapsedSteps);
    }

    function _getCurrentUserBalance(
        UserBalance memory _balance
    ) internal view returns (uint) {
        if (_balance.lastUpdated == 0) {
            _balance.credits = userStartingCredits;
            _balance.lastUpdated = ourVoiceRegistry
                .getUserRegistration(msg.sender)
                .registrationTimestamp;
        }

        uint _elapsedSteps = _elapsedStepsBetweenTimestamps(
            _balance.lastUpdated,
            block.timestamp
        );
        return _balance.credits + (_elapsedSteps * userCreditAllowancePerStep);
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
            _decayValue(_support.value, _support.lastUpdated, block.timestamp);
    }

    function _updateSupportToBeCurrent(Support storage _support) internal {
        _support.value = _decayValue(
            _support.value,
            _support.lastUpdated,
            block.timestamp
        );
        _support.lastUpdated = block.timestamp;
    }

    function _costOfUserSupport(int _userSupport) internal pure returns (uint) {
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
        for (uint i = 0; i < _userSupportedStatements[_userId].length; i++) {
            uint _currStatementId = _userSupportedStatements[_userId][i];
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
            _userSupportedStatements[_userId].push(_statementId);
        } else {
            _userSupportedStatements[_userId][
                uint(_firstEmptySlot)
            ] = _statementId;
        }

        if (
            _secondEmptySlot != -1 &&
            _lastOccupiedSlot != -1 &&
            _lastOccupiedSlot > _secondEmptySlot
        ) {
            _userSupportedStatements[_userId][
                uint(_secondEmptySlot)
            ] = _userSupportedStatements[_userId][uint(_lastOccupiedSlot)];
            _userSupportedStatements[_userId].pop();
        }
    }

    function adjustSupport(
        SupportAdjustment[] calldata _supportAdjustments
    ) external onlyMembers {
        if (!ourVoiceRegistry.isRegistered(msg.sender))
            revert UserNotRegistered(msg.sender);
        bytes32 _userId = ourVoiceRegistry.getUserIdentifier(msg.sender);

        UserBalance storage _userBalance = userCredits[_userId];
        _updateUserBalanceToBeCurrent(_userBalance);

        int _totalCostChange = 0;

        for (uint i = 0; i < _supportAdjustments.length; i++) {
            SupportAdjustment memory _adjustment = _supportAdjustments[i];
            if (_adjustment.statementId >= statementCount)
                revert InvalidStatementId(_adjustment.statementId);

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

            // Emit engagement event if enough time has passed since the last one
            if (
                block.timestamp >=
                statements[_adjustment.statementId]
                    .lastEngagementEventTimestamp +
                    engagementWindowSeconds
            ) {
                statements[_adjustment.statementId]
                    .lastEngagementEventTimestamp = block.timestamp;
                emit StatementEngaged(_adjustment.statementId);
            }
        }

        if (int(_userBalance.credits) < _totalCostChange)
            revert InsufficientCredits(_userBalance.credits, _totalCostChange);
        _userBalance.credits = uint(
            int(_userBalance.credits) - _totalCostChange
        );
    }

    /// @notice Reverts if the current decay step does not match the expected value.
    /// @dev Intended for use via multicall to guard against decay drift.
    function requireStep(uint _expectedStep) external view {
        uint actualStep = block.timestamp / stepDurationSeconds;
        if (actualStep != _expectedStep)
            revert StaleStep(_expectedStep, actualStep);
    }

    fallback() external {}
}
