// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

//       v     v       v
// 20 10 2 2 2 1 1 1 1 0 0 0 0 0

contract Forum {
    uint public constant MAX_STATEMENT_LENGTH = 120;
    uint public constant USER_CREDIT_BUDGET = 100;

    struct Vote {
        uint statementId;
        uint voteCount;
    }

    struct Statement {
        uint id;
        string text;
        uint voteCount;
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

    mapping(address => mapping(uint => uint)) public userVotes;
    mapping(address => Vote[]) public userVoteSets;
    mapping(address => uint) public userUsedCredits;

    event UserVote(address indexed user, string action, uint count);
    event StatementVote(uint indexed id, uint voteCount);

    function addStatement(string calldata _statement) external {
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
        statementCount++;
    }

    function getRankedStatement(
        uint _rank
    ) external view returns (Statement memory) {
        require(_rank < statementCount, "Rank is larger than statement count");
        return statements[statementRankings[_rank]];
    }

    function getRankedStatementsRange(
        uint _start,
        uint _end
    ) external view returns (Statement[] memory) {
        require(_start < statementCount, "Start is larger than statement count");
        require(_end <= statementCount, "End is larger than statement count");
        require(_start < _end, "Start must be less than end");

        Statement[] memory rankedStatements = new Statement[](_end - _start);
        for (uint i = _start; i < _end; i++) {
            rankedStatements[i - _start] = statements[statementRankings[i]];
        }
        return rankedStatements;
    }

    function rerankItem(uint _stmtId) internal {
        Statement memory statement = statements[_stmtId];
        uint _stmtRank = statement.rank;
        uint _voteCount = statement.voteCount;

        while (true) {
            // check if we should bubble up
            if (_stmtRank > 0) {
                uint _prevVoteCount = statements[
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
            if (_stmtRank < statementCount - 1) {
                uint _succVoteCount = statements[
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

    function getUserVoteSet() external view returns (Vote[] memory) {
        return userVoteSets[msg.sender];
    }

    function vote(Vote[] calldata _voteSet) public {
        require(_voteSet.length > 0, "Vote set cannot be empty");
        // require(voteSet.length <= USER_BUDGET, "Vote set exceeds user budget");

        int _creditCost = 0;

        for (uint i = 0; i < _voteSet.length; i++) {
            Vote memory _vote = _voteSet[i];
            require(_vote.statementId < statementCount, "Invalid statement ID");

            uint _currentVote = userVotes[msg.sender][_vote.statementId];

            if (_currentVote == _vote.voteCount) {
                continue;
            }

            // keep track of the credit difference
            // (0, 1, true)
            (uint smaller, uint larger, bool isRebate) = _currentVote <
                _vote.voteCount
                ? (_currentVote, _vote.voteCount, false)
                : (_vote.voteCount, _currentVote, true);
            uint absoluteDifference = larger * larger - smaller * smaller;

            if (isRebate) {
                _creditCost -= int(absoluteDifference);
            } else {
                _creditCost += int(absoluteDifference);
            }

            userVotes[msg.sender][_vote.statementId] = _vote.voteCount;

            // Update the statement's vote count
            statements[_vote.statementId].voteCount =
                statements[_vote.statementId].voteCount +
                _vote.voteCount -
                _currentVote;

            rerankItem(_vote.statementId);

            emit UserVote(msg.sender, "vote", _vote.voteCount);
            emit StatementVote(
                _vote.statementId,
                statements[_vote.statementId].voteCount
            );
        }

        if (
            int(userUsedCredits[msg.sender]) + _creditCost >
            int(USER_CREDIT_BUDGET)
        ) {
            revert("Insufficient credits for this vote set");
        }

        userUsedCredits[msg.sender] = _creditCost >= 0
            ? userUsedCredits[msg.sender] + uint(_creditCost)
            : userUsedCredits[msg.sender] - uint(-_creditCost);

        delete userVoteSets[msg.sender];
        for (uint i = 0; i < _voteSet.length; i++) {
            userVoteSets[msg.sender].push(_voteSet[i]);
        }
    }

    fallback() external {}
}
