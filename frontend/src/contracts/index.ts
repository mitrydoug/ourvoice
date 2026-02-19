/**
 * Contract bindings — barrel export for the frontend.
 *
 * ABIs are loaded from compiled Hardhat artifacts (TypeScript files committed
 * to the repo). Addresses come from per-network files under `networks/`,
 * selected at build time via the `VITE_NETWORK` environment variable.
 * The active registry ABI is selected via `VITE_REGISTRY_MODE`.
 */

import ForumABI from "./abis/Forum";
import OurVoiceRegistryABI from "./abis/OurVoiceRegistry";
import MockOurVoiceRegistryABI from "./abis/MockOurVoiceRegistry";

// ---------------------------------------------------------------------------
// Network addresses — resolved at build time via import.meta.glob so that
// gitignored dev-network files don't cause errors in production builds.
// ---------------------------------------------------------------------------

type NetworkModule = {
  FORUMS: Readonly<Record<string, `0x${string}`>>;
  REGISTRY_ADDRESS: `0x${string}`;
};

const networkModules = import.meta.glob<NetworkModule>("./networks/*.ts", {
  eager: true,
});

const networkName = import.meta.env.VITE_NETWORK ?? "localhost";
const activeNetwork = networkModules[`./networks/${networkName}.ts`];

if (!activeNetwork) {
  const available = Object.keys(networkModules)
    .map((k) => k.replace("./networks/", "").replace(".ts", ""))
    .join(", ");
  throw new Error(
    `Network "${networkName}" not found. ` +
      `Run the deploy script or set VITE_NETWORK. Available: ${available}`,
  );
}

export const FORUMS = activeNetwork.FORUMS;

const REGISTRY_ADDRESS = activeNetwork.REGISTRY_ADDRESS;

/** true when the frontend targets a MockOurVoiceRegistry deployment. */
export const isDevMode = import.meta.env.VITE_REGISTRY_MODE !== "production";

export const FORUM_ABI = ForumABI;

/**
 * Contract config for the production OurVoiceRegistry.
 * `register()` expects `ProofVerificationParams` from zkpassport.
 */
export const registryContractConfig = {
  address: REGISTRY_ADDRESS,
  abi: OurVoiceRegistryABI,
} as const;

/**
 * Contract config for the MockOurVoiceRegistry (dev/test only).
 * `register()` accepts a plain nationality string.
 */
export const mockRegistryContractConfig = {
  address: REGISTRY_ADDRESS,
  abi: MockOurVoiceRegistryABI,
} as const;
