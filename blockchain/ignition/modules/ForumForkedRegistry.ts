import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VERIFIER_ADDRESS = "0x3101Bad9eA5fACadA5554844a1a88F7Fe48D4DE0";
const MY_SCOPE = "our-voice-verify";

export default buildModule("ForumForkedRegistryModule", (m) => {

  const ZKPassportVerifier = m.contractAt("IZKPassportVerifier", VERIFIER_ADDRESS);

  const ZKPassportRegistry = m.contract("ZKRegistry", [MY_SCOPE, "127.0.0.1", ZKPassportVerifier, true]);

  const forum = m.contract("Forum", [ZKPassportRegistry]);

  return { registry: ZKPassportRegistry, forum };

});
