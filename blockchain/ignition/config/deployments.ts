/**
 * Deployment configuration per Hardhat network.
 *
 * Maps each network name to the Ignition module mode and forum list
 * to deploy. For "production" mode, a parameters file path (relative
 * to ignition/parameters/) supplies the module's runtime parameters.
 */

type MockedDeploymentConfig = {
  mode: "mocked";
  forums: string[];
};

type ProductionDeploymentConfig = {
  mode: "production";
  forums: string[];
  parametersFile: string;
};

export type DeploymentConfig = MockedDeploymentConfig | ProductionDeploymentConfig;

const deploymentConfigs: Record<string, DeploymentConfig> = {
  /** Local development on a fresh Hardhat node with mock data. */
  default: {
    mode: "mocked",
    forums: ["global", "us"],
  },

  /** Docker Compose Hardhat node with mock data. */
  compose_hardhat: {
    mode: "mocked",
    forums: ["global", "us"],
  },

  /** Local Sepolia fork with real OurVoiceRegistry (dev mode). */
  local_sepolia_fork: {
    mode: "production",
    forums: ["global", "us", "zkr"],
    parametersFile: "local-fork.json",
  },

  /** Real Sepolia testnet deployment. */
  sepolia: {
    mode: "production",
    forums: ["global", "us", "zkr"],
    parametersFile: "sepolia.json",
  },
};

export function getDeploymentConfig(networkName: string): DeploymentConfig {
  const config = deploymentConfigs[networkName];
  if (!config) {
    throw new Error(
      `No deployment config for network "${networkName}". ` +
      `Known networks: ${Object.keys(deploymentConfigs).join(", ")}`,
    );
  }
  return config;
}
