import jazzicon from "@metamask/jazzicon";

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
 * Truncate an Ethereum address to `0x1a2B…3c4D` format.
 * Shows the first 6 and last 4 hex characters (industry standard).
 */
export const shortenAddress = (address: string): string =>
  `${address.slice(0, 6)}…${address.slice(-4)}`;

export const metamaskIcon = (address: string) => {
  console.log(address);
  const jazziconData = jazzicon(16, parseInt(address.slice(2, 10), 16));
  const jazziconSvg = new XMLSerializer().serializeToString(
    jazziconData.children[0],
  );
  return `data:image/svg+xml,${encodeURIComponent(jazziconSvg)}`;
};
