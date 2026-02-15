import hre from "hardhat";
import path from "path";
import { writeFileSync } from "fs";
import { createForumProductionModule } from "../ignition/modules/ForumProduction.js";
import { createForumMockedModule } from "../ignition/modules/ForumMockedRegistry.js";
import { getDeploymentConfig } from "../ignition/config/deployments.js";

/** Minimal contract shape we need for post-deploy output generation. */
type DeployedContract = { address: string; abi: unknown[] };

async function main() {
  const connection = await hre.network.connect();
  const { networkName, ignition } = connection;
  const config = getDeploymentConfig(networkName);

  console.log(
    `Deploying to network "${networkName}" in "${config.mode}" mode…`,
  );
  console.log(`Forums: ${config.forums.join(", ")}`);

  let registry: DeployedContract;
  let forums: Record<string, DeployedContract>;

  if (config.mode === "mocked") {
    // Simulated networks only: advance block timestamp to real time so that
    // time-dependent contract logic behaves realistically during development.
    const { networkHelpers } = connection;
    await networkHelpers.time.increaseTo(Math.floor(Date.now() / 1000) + 1);

    const module = createForumMockedModule(config.forums);
    const deployResult = await ignition.deploy(module);
    ({ registry, ...forums } = deployResult);
  } else {
    const module = createForumProductionModule(config.forums);
    const parametersPath = path.resolve(
      import.meta.dirname,
      "../ignition/parameters",
      config.parametersFile,
    );
    const deployResult = await ignition.deploy(module, {
      parameters: parametersPath,
    });
    ({ registry, ...forums } = deployResult);
  }

  console.log("Deployed OurVoiceRegistry at:", registry.address);
  for (const [name, contract] of Object.entries(forums)) {
    console.log(`Deployed Forum (${name}) at:`, contract.address);
  }

  const forumAddresses = Object.fromEntries(
    Object.entries(forums).map(([name, contract]) => [name, contract.address]),
  );

  const configModuleText =
    `export const FORUMS = ${JSON.stringify(forumAddresses, null, 2)} as const;\n\n` +
    `export const FORUM_ABI = ${JSON.stringify(forums["global"].abi, null, 2)} as const;\n\n` +
    "export const registryContractConfig = {\n" +
    `  address: "${registry.address}",\n` +
    `  abi: ${JSON.stringify(registry.abi, null, 2)},\n` +
    "} as const;\n\n";

  writeFileSync("../frontend/src/contracts.ts", configModuleText);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
