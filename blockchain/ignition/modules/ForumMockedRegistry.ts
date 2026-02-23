import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deployForums } from "./helpers/deployForums.js";

type MockStatement = {
  addrIndex: number;
  forum: string;
  content: string;
};

const MOCK_STATEMENTS: MockStatement[] = [
  {
    addrIndex: 0,
    forum: "USA",
    content: "Access to high-quality medical care is a human right.",
  },
  {
    addrIndex: 2,
    forum: "USA",
    content: "We need to consider and prevent the potential downsides of AI.",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Loneliness is an epidemic. Touch grass, find a friend.",
  },
  { addrIndex: 2, forum: "USA", content: "We're better together." },
  { addrIndex: 0, forum: "USA", content: "I want something to believe in." },
  {
    addrIndex: 0,
    forum: "USA",
    content: "Nothing heals like a good chocolate chip cookie!",
  },
  {
    addrIndex: 2,
    forum: "USA",
    content: "We're in the longest government shutdown in our history.",
  },
  {
    addrIndex: 0,
    forum: "USA",
    content: "All work and now play makes Hannah and sad girl",
  },
  {
    addrIndex: 2,
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
    m.call(mockedZKRegistry, "register", ["USA"], {
      from: address3,
      id: "register3",
    });

    const { forums } = deployForums(m, mockedZKRegistry, forumNames, stepDurationSeconds);

    MOCK_STATEMENTS.forEach((stmt, idx) => {
      const fromAddress = m.getAccount(stmt.addrIndex);
      m.call(forums[stmt.forum], "addStatement", [stmt.content], {
        id: `addMockStatement${idx}`,
        from: fromAddress,
      });
    });

    return { registry: mockedZKRegistry, ...forums };
  });
}
