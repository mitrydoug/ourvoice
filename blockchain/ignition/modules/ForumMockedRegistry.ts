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
  rateLimitCapacityUnits: number,
  rateLimitLeakUnitsPerDay: number,
) {
  return buildModule("ForumMockedRegistryModule", (m) => {
    const mockedZKRegistry = m.contract("MockSymvoliaRegistry");

    const rateLimiter = m.contract("SponsorshipRateLimiter", [
      rateLimitCapacityUnits,
      rateLimitLeakUnitsPerDay,
    ]);

    const { forums } = deployForums(
      m,
      mockedZKRegistry,
      rateLimiter,
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

    // Freeze the authorized-caller set: only the forums meter usage here, since
    // MockSymvoliaRegistry does not charge the rate limiter on registration.
    m.call(rateLimiter, "initialize", [Object.values(forums)]);

    return { registry: mockedZKRegistry, ...forums };
  });
}
