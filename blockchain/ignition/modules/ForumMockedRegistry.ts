import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deployForums } from "./helpers/deployForums.js";
import { CRED_MULT } from "../config/deployments.js";

type MockStatement = {
  addrIndex: number;
  forum: string;
  content: string;
  /** Initial support applied by the author at creation time (default 0). */
  initialSupport?: number;
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
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "We need to consider and prevent the potential downsides of AI.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Loneliness is an epidemic. Touch grass, find a friend.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "We're better together.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "I want something to believe in.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Nothing heals like a good chocolate chip cookie!",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "We're in the longest government shutdown in our history.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "All work and now play makes Hannah and sad girl",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content:
      "We should continue providing SNAP benefits despite the government shutdown",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 0,
    forum: "USA",
    content:
      "There should be a minimum of 4 weeks PTO for primary care givers.",
    initialSupport: 10 * CRED_MULT,
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
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 1,
    forum: "CAN",
    content: "We need more affordable housing in our cities.",
    initialSupport: 10 * CRED_MULT,
  },
  {
    addrIndex: 1,
    forum: "CAN",
    content: "Reconciliation with Indigenous peoples must be a priority.",
    initialSupport: 10 * CRED_MULT,
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
/**
 * Cross-user support votes. Author self-support is now handled by
 * initialSupport in MOCK_STATEMENTS above, so only votes from users
 * other than the statement author remain here.
 */
const MOCK_SUPPORT: MockSupport[] = [
  // ── global forum: support from users other than the author ──
  { addrIndex: 1, forum: "global", statementIndex: 0, value: 10 * CRED_MULT },
  { addrIndex: 2, forum: "global", statementIndex: 0, value: 10 * CRED_MULT },
  { addrIndex: 0, forum: "global", statementIndex: 1, value: 10 * CRED_MULT },
  { addrIndex: 2, forum: "global", statementIndex: 1, value: 10 * CRED_MULT },
  { addrIndex: 0, forum: "global", statementIndex: 2, value: 10 * CRED_MULT },
  { addrIndex: 1, forum: "global", statementIndex: 2, value: 10 * CRED_MULT },
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
  creditAllowanceIntervalSeconds: number,
  engagementWindowSeconds: number,
  maxRankedStatements: number,
  minStatementSupportToRank: number,
  maxStatementLength: number,
  userCreditAllowancePerInterval: number,
  userStartingCredits: number,
  minAdjustmentIntervalSeconds: number,
  creditMultiplier: number,
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
      creditAllowanceIntervalSeconds, engagementWindowSeconds,
      maxRankedStatements, minStatementSupportToRank,
      maxStatementLength, userCreditAllowancePerInterval, userStartingCredits,
      minAdjustmentIntervalSeconds,
      creditMultiplier,
    );

    // Track statement futures per forum so support calls can depend on them
    const statementFutures: Record<string, ReturnType<typeof m.call>[]> = {};
    MOCK_STATEMENTS.forEach((stmt, idx) => {
      const fromAddress = m.getAccount(stmt.addrIndex);
      const future = m.call(forums[stmt.forum], "addStatement", [stmt.content, BigInt(stmt.initialSupport ?? 0)], {
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
