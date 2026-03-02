import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deployForums } from "./helpers/deployForums.js";

type MockStatement = {
  addrIndex: number;
  forum: string;
  content: string;
};

type MockSupport = {
  addrIndex: number;
  forum: string;
  /** Statement index within this forum (0-based). */
  statementIndex: number;
  value: number;
};

const MOCK_STATEMENTS: MockStatement[] = [
  {
    addrIndex: 0,
    forum: "USA",
    content: "Access to high-quality medical care is a human right.",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "We need to consider and prevent the potential downsides of AI.",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Loneliness is an epidemic. Touch grass, find a friend.",
  },
  { addrIndex: 0, forum: "USA", content: "We're better together." },
  { addrIndex: 0, forum: "USA", content: "I want something to believe in." },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Nothing heals like a good chocolate chip cookie!",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "We're in the longest government shutdown in our history.",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "All work and now play makes Hannah and sad girl",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content:
      "We should continue providing SNAP benefits despite the government shutdown",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content:
      "There should be a minimum of 4 weeks PTO for primary care givers.",
  },
  { addrIndex: 0, forum: "global", content: "Gazan's deserve to not starve." },
  {
    addrIndex: 1,
    forum: "global",
    content: "Cooperation and peace > arms races and mistrust",
  },
  { addrIndex: 2, forum: "global", content: "Stand with Ukraine." },
  {
    addrIndex: 1,
    forum: "CAN",
    content: "Universal healthcare is something to be proud of.",
  },
  {
    addrIndex: 1,
    forum: "CAN",
    content: "We need more affordable housing in our cities.",
  },
  {
    addrIndex: 1,
    forum: "CAN",
    content: "Reconciliation with Indigenous peoples must be a priority.",
  },
];

/**
 * Mock support votes so statements cross MIN_STATEMENT_SUPPORT_TO_RANK (≥ 2)
 * and appear in the ranked listings.
 *
 * Each forum contract assigns statement IDs sequentially starting at 0,
 * so `statementIndex` here matches the insertion order within that forum.
 *
 * Membership (determined by registration order):
 *   - account 0 (nationality "USA") → member of USA & global
 *   - account 1 (nationality "CAN") → member of CAN & global
 *   - account 2 (nationality "")    → member of global only
 */
const MOCK_SUPPORT: MockSupport[] = [
  // ── USA forum: only account 0 is a member, so one user gives +2 ──
  { addrIndex: 0, forum: "USA", statementIndex: 0, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 1, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 2, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 3, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 4, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 5, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 6, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 7, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 8, value: 10 },
  { addrIndex: 0, forum: "USA", statementIndex: 9, value: 10 },

  // ── global forum: accounts 0, 1, 2 are all members ──
  { addrIndex: 1, forum: "global", statementIndex: 0, value: 10 },
  { addrIndex: 2, forum: "global", statementIndex: 0, value: 10 },
  { addrIndex: 0, forum: "global", statementIndex: 1, value: 10 },
  { addrIndex: 2, forum: "global", statementIndex: 1, value: 10 },
  { addrIndex: 0, forum: "global", statementIndex: 2, value: 10 },
  { addrIndex: 1, forum: "global", statementIndex: 2, value: 10 },

  // ── CAN forum: only account 1 is a member, so one user gives +2 ──
  { addrIndex: 1, forum: "CAN", statementIndex: 0, value: 10 },
  { addrIndex: 1, forum: "CAN", statementIndex: 1, value: 10 },
  { addrIndex: 1, forum: "CAN", statementIndex: 2, value: 10 },
];

/**
 * Creates a mocked Ignition module that deploys a MockOurVoiceRegistry
 * (allowing unverified user registration), a set of Forum contracts, and
 * seeds fixture data (mock user registrations and statements).
 *
 * Intended for local development on a fresh Hardhat network.
 */
export function createForumMockedModule(
  forumNames: string[],
  stepDurationSeconds: number,
  engagementWindowSeconds: number,
  maxRankedStatements: number,
  minStatementSupportToRank: number,
  maxStatementLength: number,
  userCreditAllowancePerStep: number,
  userStartingCredits: number,
) {
  return buildModule("ForumMockedRegistryModule", (m) => {
    const address1 = m.getAccount(0);
    const address2 = m.getAccount(1);
    const address3 = m.getAccount(2);

    const mockedZKRegistry = m.contract("MockOurVoiceRegistry");

    m.call(mockedZKRegistry, "register", ["USA"], {
      from: address1,
      id: "register1",
    });
    m.call(mockedZKRegistry, "register", [""], {
      from: address2,
      id: "register2",
    });
    m.call(mockedZKRegistry, "register", ["CAN"], {
      from: address2,
      id: "register3",
    });
    m.call(mockedZKRegistry, "register", [""], {
      from: address3,
      id: "register4",
    });

    const { forums } = deployForums(
      m, mockedZKRegistry, forumNames,
      stepDurationSeconds, engagementWindowSeconds,
      maxRankedStatements, minStatementSupportToRank,
      maxStatementLength, userCreditAllowancePerStep, userStartingCredits,
    );

    // Track statement futures per forum so support calls can depend on them
    const statementFutures: Record<string, ReturnType<typeof m.call>[]> = {};
    MOCK_STATEMENTS.forEach((stmt, idx) => {
      const fromAddress = m.getAccount(stmt.addrIndex);
      const future = m.call(forums[stmt.forum], "addStatement", [stmt.content], {
        id: `addMockStatement${idx}`,
        from: fromAddress,
      });
      if (!statementFutures[stmt.forum]) statementFutures[stmt.forum] = [];
      statementFutures[stmt.forum].push(future);
    });

    // Add mock support so statements cross the ranking threshold
    MOCK_SUPPORT.forEach((sup, idx) => {
      const fromAddress = m.getAccount(sup.addrIndex);
      m.call(
        forums[sup.forum],
        "adjustSupport",
        [
          [
            {
              statementId: BigInt(sup.statementIndex),
              value: BigInt(sup.value),
            },
          ],
        ],
        {
          id: `addMockSupport${idx}`,
          from: fromAddress,
          // Wait for all statements in this forum to be added first
          after: statementFutures[sup.forum] ?? [],
        },
      );
    });

    return { registry: mockedZKRegistry, ...forums };
  });
}
