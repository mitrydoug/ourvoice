// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.28;

import "./IOurVoiceRegistry.sol";
import "./StringUtils.sol";

contract Forum {
    // Maximum length (in chars) of a statement
    uint public constant MAX_STATEMENT_LENGTH = 120;
    // Amount of credits a user is credited weekly
    uint public constant USER_CREDIT_WEEKLY_ALLOWANCE = 1000;
    // We only track this many statements for ranking purposes
    uint public constant MAX_RANKED_STATEMENTS = 1000;

    uint public constant SUPPORT_HALF_LIFE = 7 days;

    AOurVoiceRegistry public ourVoiceRegistry;

    struct Vote {
        uint statementId;
        int voteCount;
    }

    struct Statement {
        uint id;
        string text;
        int voteCount;
        uint rank;
        uint timestamp;
    }
    uint public statementCount;

    // statement ID -> Statement
    mapping(uint => Statement) public statements;
    // rank -> statement ID
    uint[] public statementRankings;
    // vote count -> rank
    // uint[10] internal firstPerVoteCount;

    struct VotePosition {
        int voteCount;
        uint lastVoteTimestamp;
    }

    mapping(bytes32 => mapping(uint => VotePosition)) public userVotes;

    struct UserBalance {
        uint credits;
        uint lastUpdatedTimestamp;
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

    function getStatementSupport(uint _stmtId) external view returns (int) {
        require(_stmtId < statementCount, "Invalid statement ID");

        return statements[_stmtId].voteCount;
    }

    function getStatementRankingThreshold() external view returns (int) {
        if (statementCount < MAX_RANKED_STATEMENTS) {
            return 0;
        }
        // NOTE: not it
        uint thresholdStmtId = statementRankings[MAX_RANKED_STATEMENTS - 1];
        return statements[thresholdStmtId].voteCount;
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

    function rerankItem(uint _stmtId) internal {
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
            voteCount: 0,
            rank: statementCount,
            timestamp: block.timestamp
        });

        statementRankings.push(statementCount);
        rerankItem(statementCount);
        emit StatementAdded(statementCount, _statement);
        statementCount++;
    }

    function getUserVoteSet() external view onlyMembers returns (Vote[] memory) {
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);
        return userVoteSets[userId];
    }

    function vote(Vote[] calldata _voteSet) public {
        require(ourVoiceRegistry.isRegistered(msg.sender), "User is not registered");
        bytes32 userId = ourVoiceRegistry.getUserIdentifier(msg.sender);
        // require(voteSet.length <= USER_BUDGET, "Vote set exceeds user budget");

        Vote[] memory previousVoteSet = userVoteSets[userId];
        for (uint i = 0; i < previousVoteSet.length; i++) {
            Vote memory _prevVote = previousVoteSet[i];
            statements[_prevVote.statementId].voteCount =
                statements[_prevVote.statementId].voteCount -
                userVotes[userId][_prevVote.statementId];
            rerankItem(_prevVote.statementId);
            userVotes[userId][_prevVote.statementId] = 0;
        }

        delete userVoteSets[userId];

        uint _creditCost = 0;

        for (uint i = 0; i < _voteSet.length; i++) {
            Vote memory _vote = _voteSet[i];
            require(_vote.statementId < statementCount, "Invalid statement ID");
            require(_vote.voteCount != 0, "Vote count cannot be zero");

            _creditCost += uint(_vote.voteCount * _vote.voteCount);

            userVotes[userId][_vote.statementId] = _vote.voteCount;
            userVoteSets[userId].push(_vote);

            // Update the statement's vote count
            statements[_vote.statementId].voteCount =
                statements[_vote.statementId].voteCount +
                _vote.voteCount;

            rerankItem(_vote.statementId);

            emit UserVote(userId, "vote", _vote.voteCount);
            emit StatementVote(
                _vote.statementId,
                statements[_vote.statementId].voteCount
            );
        }

        if (_creditCost > USER_CREDIT_BUDGET) {
            revert("Insufficient credits for this vote set");
        }

        userUsedCredits[userId] = USER_CREDIT_BUDGET - _creditCost;
    }

    fallback() external {}
}
