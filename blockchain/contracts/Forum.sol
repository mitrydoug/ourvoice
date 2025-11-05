// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./IZKRegistry.sol";

contract Forum {
    uint public constant MAX_STATEMENT_LENGTH = 120;
    uint public constant USER_CREDIT_BUDGET = 100;

    IZKRegistry public zkRegistry;

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

    mapping(bytes32 => mapping(uint => int)) public userVotes;
    mapping(bytes32 => Vote[]) public userVoteSets;
    mapping(bytes32 => uint) public userUsedCredits;

    // Membership criteria
    string public nationality;

    event UserVote(bytes32 indexed user, string action, int count);
    event StatementVote(uint indexed id, int voteCount);

    constructor(IZKRegistry _zkRegistry, string memory _nationality) {
        zkRegistry = _zkRegistry;
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
        if (!zkRegistry.isRegistered(msg.sender)) {
            return false;
        }
        if (bytes(nationality).length == 0) {
            return true;
        }
        Registration memory registration = zkRegistry.getUserRegistration(msg.sender);
        return keccak256(bytes(registration.disclosedData.nationality)) == keccak256(bytes(nationality));
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
        statementCount++;
    }

    function getUserVoteSet() external view onlyMembers returns (Vote[] memory) {
        bytes32 userId = zkRegistry.getUserIdentifier(msg.sender);
        return userVoteSets[userId];
    }

    function vote(Vote[] calldata _voteSet) public {
        require(zkRegistry.isRegistered(msg.sender), "User is not registered");
        bytes32 userId = zkRegistry.getUserIdentifier(msg.sender);
        require(_voteSet.length > 0, "Vote set cannot be empty");
        // require(voteSet.length <= USER_BUDGET, "Vote set exceeds user budget");

        int _creditCost = 0;

        for (uint i = 0; i < _voteSet.length; i++) {
            Vote memory _vote = _voteSet[i];
            require(_vote.statementId < statementCount, "Invalid statement ID");

            int _currentVote = userVotes[userId][_vote.statementId];

            if (_currentVote == _vote.voteCount) {
                continue;
            }

            int _currentCost = _currentVote * _currentVote;
            int _newCost = _vote.voteCount * _vote.voteCount;
            _creditCost += _newCost - _currentCost;

            userVotes[userId][_vote.statementId] = _vote.voteCount;

            // Update the statement's vote count
            statements[_vote.statementId].voteCount =
                statements[_vote.statementId].voteCount +
                _vote.voteCount -
                _currentVote;

            rerankItem(_vote.statementId);

            emit UserVote(userId, "vote", _vote.voteCount);
            emit StatementVote(
                _vote.statementId,
                statements[_vote.statementId].voteCount
            );
        }

        if (
            int(userUsedCredits[userId]) + _creditCost >
            int(USER_CREDIT_BUDGET)
        ) {
            revert("Insufficient credits for this vote set");
        }

        userUsedCredits[userId] = _creditCost >= 0
            ? userUsedCredits[userId] + uint(_creditCost)
            : userUsedCredits[userId] - uint(-_creditCost);

        delete userVoteSets[userId];
        for (uint i = 0; i < _voteSet.length; i++) {
            userVoteSets[userId].push(_voteSet[i]);
        }
    }

    fallback() external {}
}
