import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const VERIFIER_ADDRESS = "0x1D000001000EFD9a6371f4d90bB8920D5431c0D8";
const MY_SCOPE = "our-voice-verify";
const FORUMS = ["global", "us", "zkr"];

export default buildModule("ForumForkedRegistryModule", (m) => {
  const ZKPassportVerifier = m.contractAt(
    "IZKPassportVerifier",
    VERIFIER_ADDRESS,
  );

  const OurVoiceRegistry = m.contract("OurVoiceRegistry", [
    MY_SCOPE,
    "localhost",
    ZKPassportVerifier,
    true,
  ]);

  const forums = Object.fromEntries(
    FORUMS.map((forum) => {
      return [
        forum,
        m.contract(
          "Forum",
          [OurVoiceRegistry, forum == "global" ? "" : forum],
          { id: `Forum_${forum}` },
        ),
      ];
    }),
  );

  return { registry: OurVoiceRegistry, ...forums };
});
