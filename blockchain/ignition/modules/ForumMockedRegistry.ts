import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FORUMS = ["global", "us"];

type MockStatement = {
  addrIndex: number;
  forum: string;
  content: string;
};

const MOCK_STATEMENTS: MockStatement[] = [
  {
    addrIndex: 0,
    forum: "us",
    content: "Access to high-quality medical care is a human right.",
  },
  {
    addrIndex: 2,
    forum: "us",
    content: "We need to consider and prevent the potential downsides of AI.",
  },
  {
    addrIndex: 0,
    forum: "us",
    content: "Loneliness is an epidemic. Touch grass, find a friend.",
  },
  { addrIndex: 2, forum: "us", content: "We're better together." },
  { addrIndex: 0, forum: "us", content: "I want something to believe in." },
  {
    addrIndex: 0,
    forum: "us",
    content: "Nothing heals like a good chocolate chip cookie!",
  },
  {
    addrIndex: 2,
    forum: "us",
    content: "We're in the longest government shutdown in our history.",
  },
  {
    addrIndex: 0,
    forum: "us",
    content: "All work and now play makes Hannah and sad girl",
  },
  {
    addrIndex: 2,
    forum: "us",
    content:
      "We should continue providing SNAP benefits despite the government shutdown",
  },
  {
    addrIndex: 0,
    forum: "us",
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

export default buildModule("ForumMockedRegistryModule", (m) => {
  const address1 = m.getAccount(0);
  const address2 = m.getAccount(1);
  const address3 = m.getAccount(2);

  const mockedZKRegistry = m.contract("MockOurVoiceRegistry");
  const decayUtilsLib = m.contract("DecayUtils");

  m.call(mockedZKRegistry, "register", ["us"], {
    from: address1,
    id: "register1",
  });
  m.call(mockedZKRegistry, "register", [""], {
    from: address2,
    id: "register2",
  });
  m.call(mockedZKRegistry, "register", ["us"], {
    from: address3,
    id: "register3",
  });

  const forums = Object.fromEntries(
    FORUMS.map((forum) => {
      return [
        forum,
        m.contract(
          "Forum",
          [mockedZKRegistry, forum == "global" ? "" : forum],
          { id: `Forum_${forum}`, libraries: { DecayUtils: decayUtilsLib } },
        ),
      ];
    }),
  );

  MOCK_STATEMENTS.forEach((stmt, idx) => {
    const fromAddress = m.getAccount(stmt.addrIndex);
    m.call(forums[stmt.forum], "addStatement", [stmt.content], {
      id: `addMockStatement${idx}`,
      from: fromAddress,
    });
  });

  return { registry: mockedZKRegistry, ...forums };
});
