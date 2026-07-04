import { createConfig } from "@privy-io/wagmi";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { base, baseSepolia, hardhat, type Chain } from "wagmi/chains";
import { http } from "wagmi";
import { optionalEnvValue, requiredEnvValue } from "./envVars";
import { resolveRpcUrl } from "./rpcUrl";

// ---------------------------------------------------------------------------
// Derive the single target chain from VITE_NETWORK.  Every deployment is
// confined to exactly one chain. Privy and the network guard both use this
// target to keep connected wallets on the deployed chain.
// ---------------------------------------------------------------------------

const networkToChain = {
  localhost: hardhat,
  base,
  base_sepolia: baseSepolia,
} satisfies Record<string, Chain>;

type NetworkName = keyof typeof networkToChain;

const isNetworkName = (value: string): value is NetworkName =>
  value in networkToChain;

const networkNameValue = requiredEnvValue(
  "VITE_NETWORK",
  import.meta.env.VITE_NETWORK,
);

if (!isNetworkName(networkNameValue)) {
  throw new Error(
    `Unsupported VITE_NETWORK "${networkNameValue}". Expected one of: ${Object.keys(
      networkToChain,
    ).join(", ")}.`,
  );
}

const networkName = networkNameValue;

export const targetChain: Chain = networkToChain[networkName];

const networkToAverageBlockTimeSeconds: Record<string, number> = {
  localhost: 1,
  base: 2,
  base_sepolia: 2,
};

export const targetAverageBlockTimeSeconds =
  networkToAverageBlockTimeSeconds[networkName];

const _rawBlockPollingInterval = parseInt(
  import.meta.env.VITE_BLOCK_POLLING_INTERVAL_SECONDS ?? "",
  10,
);
export const blockPollingIntervalMs = Number.isFinite(_rawBlockPollingInterval)
  ? _rawBlockPollingInterval * 1000
  : 60_000;

export const privyAppId = optionalEnvValue(import.meta.env.VITE_PRIVY_APP_ID);
export const privyAppClientId = import.meta.env.VITE_PRIVY_APP_CLIENT_ID;
const isGasSponsorshipRequested =
  import.meta.env.VITE_ENABLE_GAS_SPONSORSHIP === "true";
const gasSponsorshipSupportedChainIds: ReadonlySet<number> = new Set([
  base.id,
  baseSepolia.id,
]);
// Whether gas sponsorship is *available* for this deployment (env flag + a
// supported chain). This is a capability flag, not a per-user decision: the
// wallet module (`useActiveWallet`) only sponsors when the user actually has a
// smart wallet connected. External and embedded-EOA wallets are self-funded.
export const isGasSponsorshipEnabled =
  isGasSponsorshipRequested &&
  gasSponsorshipSupportedChainIds.has(targetChain.id);
export const alchemyGasPolicyId = optionalEnvValue(
  import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID,
);
export const smartWalletsConfig =
  isGasSponsorshipEnabled && alchemyGasPolicyId
    ? { paymasterContext: { policyId: alchemyGasPolicyId } }
    : undefined;

const targetRpcUrl = resolveRpcUrl(
  requiredEnvValue("VITE_RPC_URL", import.meta.env.VITE_RPC_URL),
);

export const privyConfig = {
  appearance: {
    theme: "light",
    accentColor: "#1976d2",
    showWalletLoginFirst: false,
    walletChainType: "ethereum-only",
    walletList: [
      "detected_wallets",
      "metamask",
      "coinbase_wallet",
      "wallet_connect",
    ],
  },
  loginMethods: ["email", "wallet", "passkey"],
  walletConnectCloudProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID,
  supportedChains: [targetChain],
  defaultChain: targetChain,
  embeddedWallets: {
    ethereum: {
      createOnLogin: "users-without-wallets",
    },
  },
} satisfies PrivyClientConfig;

const wagmiConfig = createConfig({
  chains: [targetChain] as const,
  transports: {
    [targetChain.id]: http(targetRpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

export default wagmiConfig;
