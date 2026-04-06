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
  creditAllowanceIntervalSeconds: number;
  engagementWindowSeconds: number;
  maxRankedStatements: number;
  minStatementSupportToRank: number;
  maxStatementLength: number;
  userCreditAllowancePerInterval: number;
  userStartingCredits: number;
  minAdjustmentIntervalSeconds: number;
};

type ProductionDeploymentConfig = {
  mode: "production";
  forums: string[];
  creditAllowanceIntervalSeconds: number;
  engagementWindowSeconds: number;
  maxRankedStatements: number;
  minStatementSupportToRank: number;
  maxStatementLength: number;
  userCreditAllowancePerInterval: number;
  userStartingCredits: number;
  minAdjustmentIntervalSeconds: number;
  parametersFile: string;
};

export type DeploymentConfig = MockedDeploymentConfig | ProductionDeploymentConfig;

const deploymentConfigs: Record<string, DeploymentConfig> = {
  /** Local development on a fresh Hardhat node with mock data. */
  default: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
  },

  /** Docker Compose Hardhat node with mock data. */
  compose_hardhat: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
  },

  /** Local native Hardhat node with mock data. */
  localhost: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
  },

  /** Local native Hardhat node forking Sepolia with real ZKPassport verifier. */
  localhost_forked: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
    parametersFile: "local-fork-strict.json",
  },

  /** Docker Compose Hardhat node forking Sepolia with real ZKPassport verifier. */
  compose_hardhat_forked: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
    parametersFile: "local-fork-strict.json",
  },

  /** Local Sepolia fork with real OurVoiceRegistry (dev mode). */
  local_sepolia_fork: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
    parametersFile: "local-fork.json",
  },

  /** Real Sepolia testnet deployment. */
  sepolia: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 14400,
    engagementWindowSeconds: 86400,
    maxRankedStatements: 1000,
    minStatementSupportToRank: 10,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25,
    userStartingCredits: 1000,
    minAdjustmentIntervalSeconds: 12,
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
