export const forumContractConfig = {
  address: "0x16C632BafA9b3ce39bdCDdB00c3D486741685425",
  abi: [
    {
      inputs: [
        {
          internalType: "contract IZKRegistry",
          name: "_zkRegistry",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
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
          internalType: "bytes32",
          name: "user",
          type: "bytes32",
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
          internalType: "bytes32",
          name: "",
          type: "bytes32",
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
    {
      inputs: [],
      name: "zkRegistry",
      outputs: [
        {
          internalType: "contract IZKRegistry",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
} as const;

export const registryContractConfig = {
  address: "0xf4Dc5d7C18e71D728f04AfA31E91EE065D738221",
  abi: [
    {
      inputs: [
        {
          internalType: "string",
          name: "_scope",
          type: "string",
        },
        {
          internalType: "string",
          name: "_domain",
          type: "string",
        },
        {
          internalType: "address",
          name: "_verifierAddress",
          type: "address",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [],
      name: "domain",
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
      inputs: [
        {
          internalType: "address",
          name: "user",
          type: "address",
        },
      ],
      name: "getUserIdentifier",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "user",
          type: "address",
        },
      ],
      name: "getUserRegistration",
      outputs: [
        {
          components: [
            {
              internalType: "bytes32",
              name: "uniqueIdentifier",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "string",
                  name: "name",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "issuingCountry",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "nationality",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "gender",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "birthDate",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "expiryDate",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "documentNumber",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "documentType",
                  type: "string",
                },
              ],
              internalType: "struct DisclosedData",
              name: "disclosedData",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "registrationTimestamp",
              type: "uint256",
            },
          ],
          internalType: "struct Registration",
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
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      name: "identifierToAddress",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "user",
          type: "address",
        },
      ],
      name: "isRegistered",
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
      inputs: [
        {
          components: [
            {
              components: [
                {
                  internalType: "bytes32",
                  name: "vkeyHash",
                  type: "bytes32",
                },
                {
                  internalType: "bytes",
                  name: "proof",
                  type: "bytes",
                },
                {
                  internalType: "bytes32[]",
                  name: "publicInputs",
                  type: "bytes32[]",
                },
              ],
              internalType: "struct ProofVerificationData",
              name: "proofVerificationData",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "bytes",
                  name: "committedInputs",
                  type: "bytes",
                },
                {
                  internalType: "uint256[]",
                  name: "committedInputCounts",
                  type: "uint256[]",
                },
              ],
              internalType: "struct Commitments",
              name: "commitments",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "validityPeriodInSeconds",
                  type: "uint256",
                },
                {
                  internalType: "string",
                  name: "domain",
                  type: "string",
                },
                {
                  internalType: "string",
                  name: "scope",
                  type: "string",
                },
                {
                  internalType: "bool",
                  name: "devMode",
                  type: "bool",
                },
              ],
              internalType: "struct ServiceConfig",
              name: "serviceConfig",
              type: "tuple",
            },
          ],
          internalType: "struct ProofVerificationParams",
          name: "params",
          type: "tuple",
        },
      ],
      name: "register",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "registrationValidityPeriod",
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
      name: "scope",
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
      inputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      name: "userRegistrations",
      outputs: [
        {
          internalType: "bytes32",
          name: "uniqueIdentifier",
          type: "bytes32",
        },
        {
          components: [
            {
              internalType: "string",
              name: "name",
              type: "string",
            },
            {
              internalType: "string",
              name: "issuingCountry",
              type: "string",
            },
            {
              internalType: "string",
              name: "nationality",
              type: "string",
            },
            {
              internalType: "string",
              name: "gender",
              type: "string",
            },
            {
              internalType: "string",
              name: "birthDate",
              type: "string",
            },
            {
              internalType: "string",
              name: "expiryDate",
              type: "string",
            },
            {
              internalType: "string",
              name: "documentNumber",
              type: "string",
            },
            {
              internalType: "string",
              name: "documentType",
              type: "string",
            },
          ],
          internalType: "struct DisclosedData",
          name: "disclosedData",
          type: "tuple",
        },
        {
          internalType: "uint256",
          name: "registrationTimestamp",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "zkPassportVerifier",
      outputs: [
        {
          internalType: "contract IZKPassportVerifier",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
  ],
} as const;
