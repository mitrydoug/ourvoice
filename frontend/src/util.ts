import jazzicon from "@metamask/jazzicon";
import { keccak256, hexToNumber, type Hex } from "viem";

/** Convert credit parts to display credits (rounded to nearest integer). */
export const partsToCredits = (
  parts: number,
  creditMultiplier: number,
): number => Math.round(parts / creditMultiplier);

/** Convert display credits to credit parts. */
export const creditsToParts = (
  credits: number,
  creditMultiplier: number,
): number => credits * creditMultiplier;

/**
 * Quadratic credits consumed by a given support level in display credits.
 * Example: support 3 consumes 6 credits (1 + 2 + 3).
 */
export const supportCreditsToAllocatedCredits = (
  supportCredits: number,
): number => {
  const absSupportCredits = Math.abs(supportCredits);
  return (absSupportCredits * (absSupportCredits + 1)) / 2;
};

/**
 * Quadratic credits consumed by a given support level, expressed in credit parts.
 */
export const supportCreditsToAllocatedParts = (
  supportCredits: number,
  creditMultiplier: number,
): number =>
  creditsToParts(
    supportCreditsToAllocatedCredits(supportCredits),
    creditMultiplier,
  );

/**
 * Truncate an Ethereum address to `0x1a2B…3c4D` format.
 * Shows the first 6 and last 4 hex characters (industry standard).
 */
export const shortenAddress = (address: string): string =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

/**
 * Fold an arbitrary-length hex string into an unsigned 32-bit integer using
 * viem's `keccak256`. Every byte of the input contributes to the digest, so two
 * ids that merely share a prefix do not collide — unlike naively truncating to
 * the first few bytes. Jazzicon seeds a 32-bit PRNG, so we take the top 4 bytes
 * of the 32-byte digest as a uniform seed.
 */
const hashHexToSeed = (hex: string): number =>
  hexToNumber(keccak256(hex as Hex).slice(0, 10) as Hex);

/**
 * Generate a deterministic Jazzicon as a data URI from a hex seed
 * (e.g. an Ethereum address or a registry `userId`). All bytes of the hex
 * string are hashed into the seed, so the same input always yields the same
 * icon and distinct inputs are extremely unlikely to collide.
 */
export const jazziconDataUri = (hexSeed: string): string => {
  const jazziconData = jazzicon(16, hashHexToSeed(hexSeed));
  const jazziconSvg = new XMLSerializer().serializeToString(
    jazziconData.children[0],
  );
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
};
