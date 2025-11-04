import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FORUMS = ["global", "us"];

export default buildModule("ForumMockedRegistryModule", (m) => {

  const mockedZKRegistry = m.contract("MockZKRegistry");

  const forums = Object.fromEntries(
    FORUMS.map((forum) => [
      forum,
      m.contract("Forum", [mockedZKRegistry], { id: `Forum_${forum}` }),
    ])
  );

  return { registry: mockedZKRegistry, ...forums };

});