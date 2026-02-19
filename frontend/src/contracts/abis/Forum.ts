// Auto-extracted from blockchain/artifacts/contracts/Forum.sol/Forum.json
// Do not edit manually — re-extract from Hardhat artifacts when contracts change.

export default [
  {
    inputs: [
      {
        internalType: "contract AOurVoiceRegistry",
        name: "_ourVoiceRegistry",
        type: "address",
      },
      {
        internalType: "string",
        name: "_nationality",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "_maxRankedStatements",
        type: "uint256",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "available",
        type: "uint256",
      },
      {
        internalType: "int256",
        name: "required",
        type: "int256",
      },
    ],
    name: "InsufficientCredits",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "statementId",
        type: "uint256",
      },
    ],
    name: "InvalidStatementId",
    type: "error",
  },
  {
    inputs: [],
    name: "NotMember",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "rank",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "rankedCount",
        type: "uint256",
      },
    ],
    name: "RankOutOfBounds",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "start",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "statementCount",
        type: "uint256",
      },
    ],
    name: "StartOutOfBounds",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "length",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "maxLength",
        type: "uint256",
      },
    ],
    name: "StatementTooLong",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "user",
        type: "address",
      },
    ],
    name: "UserNotRegistered",
    type: "error",
  },
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
        internalType: "string",
        name: "statement",
        type: "string",
      },
    ],
    name: "StatementAdded",
    type: "event",
  },
  {
    stateMutability: "nonpayable",
    type: "fallback",
  },
  {
    inputs: [],
    name: "MAX_RANKED_STATEMENTS",
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
    name: "MIN_STATEMENT_SUPPORT_TO_RANK",
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
    inputs: [],
    name: "USER_CREDIT_ALLOWANCE_PER_STEP",
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
    name: "USER_STARTING_CREDITS",
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
        name: "_statementText",
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
        components: [
          {
            internalType: "uint256",
            name: "statementId",
            type: "uint256",
          },
          {
            internalType: "int256",
            name: "value",
            type: "int256",
          },
        ],
        internalType: "struct Forum.SupportAdjustment[]",
        name: "_supportAdjustments",
        type: "tuple[]",
      },
    ],
    name: "adjustSupport",
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
            internalType: "uint256",
            name: "createdTimestamp",
            type: "uint256",
          },
          {
            internalType: "int256",
            name: "support",
            type: "int256",
          },
          {
            internalType: "int256",
            name: "rank",
            type: "int256",
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
            internalType: "uint256",
            name: "createdTimestamp",
            type: "uint256",
          },
          {
            internalType: "int256",
            name: "support",
            type: "int256",
          },
          {
            internalType: "int256",
            name: "rank",
            type: "int256",
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
            internalType: "uint256",
            name: "createdTimestamp",
            type: "uint256",
          },
          {
            internalType: "int256",
            name: "support",
            type: "int256",
          },
          {
            internalType: "int256",
            name: "rank",
            type: "int256",
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
    name: "getUserBalance",
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
    name: "getUserStatementSupport",
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
            name: "support",
            type: "int256",
          },
        ],
        internalType: "struct Forum.StatementSupport[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isMember",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxRankedStatements",
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
    name: "nationality",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ourVoiceRegistry",
    outputs: [
      {
        internalType: "contract AOurVoiceRegistry",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "rankedCount",
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
        internalType: "uint256",
        name: "createdTimestamp",
        type: "uint256",
      },
      {
        components: [
          {
            internalType: "int256",
            name: "value",
            type: "int256",
          },
          {
            internalType: "uint256",
            name: "lastUpdated",
            type: "uint256",
          },
        ],
        internalType: "struct Forum.Support",
        name: "support",
        type: "tuple",
      },
      {
        internalType: "int256",
        name: "rank",
        type: "int256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    name: "userCredits",
    outputs: [
      {
        internalType: "uint256",
        name: "credits",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "lastUpdated",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    name: "userSupportMap",
    outputs: [
      {
        internalType: "int256",
        name: "value",
        type: "int256",
      },
      {
        internalType: "uint256",
        name: "lastUpdated",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;
