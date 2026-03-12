import jazzicon from "@metamask/jazzicon";

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
