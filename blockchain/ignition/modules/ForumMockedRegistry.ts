import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { deployForums } from "./helpers/deployForums.js";

/**
 * Creates a mocked Ignition module that deploys a MockSymvoliaRegistry
 * (allowing unverified user registration) and a set of Forum contracts.
 */
export function createForumMockedModule(
  forumNames: string[],
  creditAllowanceIntervalSeconds: number,
  engagementWindowSeconds: number,
  maxRankedStatements: number,
  minStatementSupportToRank: number,
  maxStatementLength: number,
  userCreditAllowancePerInterval: number,
  userStartingCredits: number,
  minAdjustmentIntervalSeconds: number,
  creditMultiplier: number,
  refundPenaltyBps: number,
  decaySpeedupFactor: number,
) {
  return buildModule("ForumMockedRegistryModule", (m) => {
    const mockedZKRegistry = m.contract("MockSymvoliaRegistry");

    const { forums } = deployForums(
      m,
      mockedZKRegistry,
      forumNames,
      creditAllowanceIntervalSeconds,
      engagementWindowSeconds,
      maxRankedStatements,
      minStatementSupportToRank,
      maxStatementLength,
      userCreditAllowancePerInterval,
      userStartingCredits,
      minAdjustmentIntervalSeconds,
      creditMultiplier,
      refundPenaltyBps,
      decaySpeedupFactor,
    );

    return { registry: mockedZKRegistry, ...forums };
  });
}
