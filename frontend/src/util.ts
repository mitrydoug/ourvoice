import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Avatar from "boring-avatars";

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
 * Generate a deterministic Boring Avatar as an SVG data URI from an arbitrary
 * seed string (e.g. a registry `userId`). The avatar is rendered entirely
 * client-side — there is no network or API dependency. The same seed always
 * yields the same avatar, and distinct seeds yield distinct avatars.
 *
 * A square variant is used so the surrounding UI can clip the corners to the
 * desired radius (see the `MuiAvatar` rounded default in the theme).
 */
export const boringAvatarDataUri = (seed: string): string => {
  const svg = renderToStaticMarkup(
    createElement(Avatar, {
      name: seed,
      size: 80,
      variant: "marble",
      square: true,
      colors: ["#e6626f", "#efae78", "#f5e19c", "#a2ca8e", "#66af91"],
    }),
  );
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
};
