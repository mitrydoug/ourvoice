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
  creditMultiplier: number;
  refundPenaltyBps: number;
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
  creditMultiplier: number;
  refundPenaltyBps: number;
  parametersFile: string;
};

export type DeploymentConfig = MockedDeploymentConfig | ProductionDeploymentConfig;

/** 1 credit = 10^6 microcredits. All credit values use this unit on-chain. */
export const CRED_MULT = 1_000_000;

const deploymentConfigs: Record<string, DeploymentConfig> = {
  /** Local development on a fresh Hardhat node with mock data. */
  default: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
  },

  /** Docker Compose Hardhat node with mock data. */
  compose_hardhat: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
  },

  /** Local native Hardhat node with mock data. */
  localhost: {
    mode: "mocked",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
  },

  /** Local native Hardhat node forking Sepolia with real ZKPassport verifier. */
  localhost_forked: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
    parametersFile: "local-fork-strict.json",
  },

  /** Docker Compose Hardhat node forking Sepolia with real ZKPassport verifier. */
  compose_hardhat_forked: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
    parametersFile: "local-fork-strict.json",
  },

  /** Local Sepolia fork with real OurVoiceRegistry (dev mode). */
  local_sepolia_fork: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 60,
    engagementWindowSeconds: 300,
    maxRankedStatements: 10,
    minStatementSupportToRank: 3 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
    parametersFile: "local-fork.json",
  },

  /** Real Sepolia testnet deployment. */
  sepolia: {
    mode: "production",
    forums: ["global", "USA", "CAN"],
    creditAllowanceIntervalSeconds: 14400,
    engagementWindowSeconds: 86400,
    maxRankedStatements: 1000,
    minStatementSupportToRank: 10 * CRED_MULT,
    maxStatementLength: 120,
    userCreditAllowancePerInterval: 25 * CRED_MULT,
    userStartingCredits: 1000 * CRED_MULT,
    minAdjustmentIntervalSeconds: 12,
    creditMultiplier: CRED_MULT,
    refundPenaltyBps: 2000,
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
