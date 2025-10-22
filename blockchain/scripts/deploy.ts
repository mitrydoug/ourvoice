import hre from "hardhat";
import ForumForkedRegistryModule from "../ignition/modules/ForumForkedRegistry.js";
// import ForumMockedRegistryModule from "../ignition/modules/ForumMockedRegistry.js";
import { writeFileSync } from "fs";


async function main() {
  const connection = await hre.network.connect();
  const { registry, forum } = await connection.ignition.deploy(ForumForkedRegistryModule);

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