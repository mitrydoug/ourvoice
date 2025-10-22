import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ForumMockedRegistryModule", (m) => {

  const mockedZKRegistry = m.contract("MockZKRegistry");

  const forum = m.contract("Forum", [mockedZKRegistry]);
  return { registry: mockedZKRegistry, forum };

});