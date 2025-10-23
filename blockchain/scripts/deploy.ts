import hre from "hardhat";
import ForumForkedRegistryModule from "../ignition/modules/ForumForkedRegistry.js";
// import ForumMockedRegistryModule from "../ignition/modules/ForumMockedRegistry.js";
import { writeFileSync } from "fs";


async function main() {
  const { ignition, networkHelpers } = await hre.network.connect();
  await networkHelpers.time.increaseTo(Math.floor(Date.now() / 1000));
  const { registry, forum } = await ignition.deploy(ForumForkedRegistryModule);

  const configModuleText = (
    "export const forumContractConfig = {\n" +
    `  address: "${forum.address}",\n` +
    `  abi: ${JSON.stringify(forum.abi, null, 2)},\n` +
    "} as const;\n\n" +
    "export const registryContractConfig = {\n" +
    `  address: "${registry.address}",\n` +
    `  abi: ${JSON.stringify(registry.abi, null, 2)},\n` +
    "} as const;\n\n"
  );

  writeFileSync(
    "../frontend/src/contracts.ts",
    configModuleText
  );
}

main().catch(console.error);