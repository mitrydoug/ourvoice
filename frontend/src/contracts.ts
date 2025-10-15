export const forumContractConfig = {
  address: "0x033238731dAa4fC147844D0575c127126d509A41",
  abi: [
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "int256",
          name: "voteCount",
          type: "int256",
        },
      ],
      name: "StatementVote",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "user",
          type: "address",
        },
        {
          indexed: false,
          internalType: "string",
          name: "action",
          type: "string",
        },
        {
          indexed: false,
          internalType: "int256",
          name: "count",
          type: "int256",
        },
      ],
      name: "UserVote",
      type: "event",
    },
    {
      stateMutability: "nonpayable",
      type: "fallback",
    },
    {
      inputs: [],
      name: "MAX_STATEMENT_LENGTH",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "USER_CREDIT_BUDGET",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "string",
          name: "_statement",
          type: "string",
        },
      ],
      name: "addStatement",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_rank",
          type: "uint256",
        },
      ],
      name: "getRankedStatement",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "id",
              type: "uint256",
            },
            {
              internalType: "string",
              name: "text",
              type: "string",
            },
            {
              internalType: "int256",
              name: "voteCount",
              type: "int256",
            },
            {
              internalType: "uint256",
              name: "rank",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "timestamp",
              type: "uint256",
            },
          ],
          internalType: "struct Forum.Statement",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "_start",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_limit",
          type: "uint256",
        },
      ],
      name: "getRankedStatementsPage",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "id",
              type: "uint256",
            },
            {
              internalType: "string",
              name: "text",
              type: "string",
            },
            {
              internalType: "int256",
              name: "voteCount",
              type: "int256",
            },
            {
              internalType: "uint256",
              name: "rank",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "timestamp",
              type: "uint256",
            },
          ],
          internalType: "struct Forum.Statement[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256[]",
          name: "_statementIds",
          type: "uint256[]",
        },
      ],
      name: "getStatementsById",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "id",
              type: "uint256",
            },
            {
              internalType: "string",
              name: "text",
              type: "string",
            },
            {
              internalType: "int256",
              name: "voteCount",
              type: "int256",
            },
            {
              internalType: "uint256",
              name: "rank",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "timestamp",
              type: "uint256",
            },
          ],
          internalType: "struct Forum.Statement[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getUserVoteSet",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "statementId",
              type: "uint256",
            },
            {
              internalType: "int256",
              name: "voteCount",
              type: "int256",
            },
          ],
          internalType: "struct Forum.Vote[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "statementCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "statementRankings",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "statements",
      outputs: [
        {
          internalType: "uint256",
          name: "id",
          type: "uint256",
        },
        {
          internalType: "string",
          name: "text",
          type: "string",
        },
        {
          internalType: "int256",
          name: "voteCount",
          type: "int256",
        },
        {
          internalType: "uint256",
          name: "rank",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "timestamp",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "userUsedCredits",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "userVoteSets",
      outputs: [
        {
          internalType: "uint256",
          name: "statementId",
          type: "uint256",
        },
        {
          internalType: "int256",
          name: "voteCount",
          type: "int256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      name: "userVotes",
      outputs: [
        {
          internalType: "int256",
          name: "",
          type: "int256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "statementId",
              type: "uint256",
            },
            {
              internalType: "int256",
              name: "voteCount",
              type: "int256",
            },
          ],
          internalType: "struct Forum.Vote[]",
          name: "_voteSet",
          type: "tuple[]",
        },
      ],
      name: "vote",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
} as const;
