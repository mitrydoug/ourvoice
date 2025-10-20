import hre from "hardhat";
// import ForumModule from "../ignition/modules/Forum.js";
import ForumModule from "../ignition/modules/Mocked.js";
import { writeFileSync } from "fs";


async function main() {
  const connection = await hre.network.connect();
  const { forum } = await connection.ignition.deploy(ForumModule);

  const configModuleText = (
    "export const forumContractConfig = {\n" +
    `  address: "${forum.address}",\n` +
    `  abi: ${JSON.stringify(forum.abi, null, 2)},\n` +
    "} as const;\n"
  );

  writeFileSync(
    "../frontend/src/contracts.ts",
    configModuleText
  );
}

main().catch(console.error);