import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ForumModule", (m) => {

  const forum = m.contract("Forum");
  return { forum };

});
