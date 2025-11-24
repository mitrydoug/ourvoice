import hre from "hardhat";
import ForumForkedRegistryModule from "../ignition/modules/ForumForkedRegistry.js";
// import ForumMockedRegistryModule from "../ignition/modules/ForumMockedRegistry.js";
import { writeFileSync } from "fs";


async function main() {
  const { ignition, networkHelpers } = await hre.network.connect();
  await networkHelpers.time.increaseTo(Math.floor(Date.now() / 1000));
  const { registry, ...forums } = await ignition.deploy(ForumForkedRegistryModule);

  const forumAddresses = Object.fromEntries(
    Object.entries(forums).map(([name, contract]) => [
      name, contract.address]
    )
  );

  const configModuleText = (
    `export const FORUMS = ${JSON.stringify(forumAddresses, null, 2)} as const;\n\n` +
    `export const FORUM_ABI = ${JSON.stringify(forums["global"].abi, null, 2)} as const;\n\n` +
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