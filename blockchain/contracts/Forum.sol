// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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
    uint timestamp;
  }
  uint public statementCount;

  mapping(uint => Statement) public statements;

  mapping(address => mapping(uint => uint)) public userVotes;
  mapping(address => uint) public userUsedCredits;

  event UserVote(address indexed user, string action, uint count);
  event StatementVote(uint indexed id, uint voteCount);

  function addStatement(string calldata _statement) external {
    require(bytes(_statement).length <= MAX_STATEMENT_LENGTH, "Statement exceeds maximum length");
    // Ensure the statement is not empty
    // check for duplicate statements if necessary
    // may want to do some rate-limiting here
    statements[statementCount] = Statement({
      id: statementCount,
      text: _statement,
      voteCount: 0,
      timestamp: block.timestamp
    });
    statementCount++;
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
      (uint smaller, uint larger, bool isRebate) = _currentVote < _vote.voteCount ? (_currentVote, _vote.voteCount, false) : (_vote.voteCount, _currentVote, true);
      uint absoluteDifference = larger * larger - smaller * smaller;


      if (isRebate) {
        _creditCost -= int(absoluteDifference);
      } else {
        _creditCost += int(absoluteDifference);
      }

      userVotes[msg.sender][_vote.statementId] = _vote.voteCount;


      // Update the statement's vote count
      statements[_vote.statementId].voteCount = statements[_vote.statementId].voteCount + _vote.voteCount - _currentVote;


      emit UserVote(msg.sender, "vote", _vote.voteCount);
      emit StatementVote(_vote.statementId, statements[_vote.statementId].voteCount);
    }


    if (int(userUsedCredits[msg.sender]) + _creditCost > int(USER_CREDIT_BUDGET)) {
      revert("Insufficient credits for this vote set");
    }

    userUsedCredits[msg.sender] = _creditCost >= 0 ? userUsedCredits[msg.sender] + uint(_creditCost) : userUsedCredits[msg.sender] - uint(-_creditCost);

  }
}
// This is a simple forum contract that allows users to add statements and vote on them.