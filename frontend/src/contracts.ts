export const FORUMS = {
  "global": "0x16C632BafA9b3ce39bdCDdB00c3D486741685425",
  "us": "0x197baBc40fC361e9c324e9e690c016A609ac09D4",
  "zk": "0xCa5C373257fC94a3C4bb258392Aa7fB61A4b7116"
} as const;

export const FORUM_ABI = [
  {
    "inputs": [
      {
        "internalType": "contract AOurVoiceRegistry",
        "name": "_ourVoiceRegistry",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "_nationality",
        "type": "string"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "voteCount",
        "type": "int256"
      }
    ],
    "name": "StatementVote",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "user",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "action",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "count",
        "type": "int256"
      }
    ],
    "name": "UserVote",
    "type": "event"
  },
  {
    "stateMutability": "nonpayable",
    "type": "fallback"
  },
  {
    "inputs": [],
    "name": "MAX_STATEMENT_LENGTH",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "USER_CREDIT_BUDGET",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_statement",
        "type": "string"
      }
    ],
    "name": "addStatement",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_rank",
        "type": "uint256"
      }
    ],
    "name": "getRankedStatement",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "text",
            "type": "string"
          },
          {
            "internalType": "int256",
            "name": "voteCount",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "rank",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct Forum.Statement",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "_start",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_limit",
        "type": "uint256"
      }
    ],
    "name": "getRankedStatementsPage",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "text",
            "type": "string"
          },
          {
            "internalType": "int256",
            "name": "voteCount",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "rank",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct Forum.Statement[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "_statementIds",
        "type": "uint256[]"
      }
    ],
    "name": "getStatementsById",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "text",
            "type": "string"
          },
          {
            "internalType": "int256",
            "name": "voteCount",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "rank",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          }
        ],
        "internalType": "struct Forum.Statement[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getUserVoteSet",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "statementId",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "voteCount",
            "type": "int256"
          }
        ],
        "internalType": "struct Forum.Vote[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "isMember",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "nationality",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ourVoiceRegistry",
    "outputs": [
      {
        "internalType": "contract AOurVoiceRegistry",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "statementCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "statementRankings",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "statements",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "text",
        "type": "string"
      },
      {
        "internalType": "int256",
        "name": "voteCount",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "rank",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "userUsedCredits",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userVoteSets",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "statementId",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "voteCount",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userVotes",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "statementId",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "voteCount",
            "type": "int256"
          }
        ],
        "internalType": "struct Forum.Vote[]",
        "name": "_voteSet",
        "type": "tuple[]"
      }
    ],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const registryContractConfig = {
  address: "0xf4Dc5d7C18e71D728f04AfA31E91EE065D738221",
  abi: [
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_scope",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_domain",
        "type": "string"
      },
      {
        "internalType": "address",
        "name": "_verifierAddress",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "_devMode",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "devMode",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "domain",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      }
    ],
    "name": "getUserIdentifier",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      }
    ],
    "name": "getUserRegistration",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "uniqueIdentifier",
            "type": "bytes32"
          },
          {
            "internalType": "string",
            "name": "nationality",
            "type": "string"
          },
          {
            "internalType": "address[]",
            "name": "registeredAddresses",
            "type": "address[]"
          }
        ],
        "internalType": "struct Registration",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_userAddress",
        "type": "address"
      }
    ],
    "name": "isRegistered",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "version",
            "type": "bytes32"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "vkeyHash",
                "type": "bytes32"
              },
              {
                "internalType": "bytes",
                "name": "proof",
                "type": "bytes"
              },
              {
                "internalType": "bytes32[]",
                "name": "publicInputs",
                "type": "bytes32[]"
              }
            ],
            "internalType": "struct ProofVerificationData",
            "name": "proofVerificationData",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "committedInputs",
            "type": "bytes"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "validityPeriodInSeconds",
                "type": "uint256"
              },
              {
                "internalType": "string",
                "name": "domain",
                "type": "string"
              },
              {
                "internalType": "string",
                "name": "scope",
                "type": "string"
              },
              {
                "internalType": "bool",
                "name": "devMode",
                "type": "bool"
              }
            ],
            "internalType": "struct ServiceConfig",
            "name": "serviceConfig",
            "type": "tuple"
          }
        ],
        "internalType": "struct ProofVerificationParams",
        "name": "_params",
        "type": "tuple"
      }
    ],
    "name": "register",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "scope",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userIdFromAddress",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "userRegistrations",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "uniqueIdentifier",
        "type": "bytes32"
      },
      {
        "internalType": "string",
        "name": "nationality",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "zkPassportVerifier",
    "outputs": [
      {
        "internalType": "contract IZKPassportVerifier",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
],
} as const;

