import { createConfig } from "@privy-io/wagmi";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { base, baseSepolia, hardhat, sepolia, type Chain } from "wagmi/chains";
import { http } from "wagmi";

// ---------------------------------------------------------------------------
// Derive the single target chain from VITE_NETWORK.  Every deployment is
// confined to exactly one chain. Privy and the network guard both use this
// target to keep connected wallets on the deployed chain.
// ---------------------------------------------------------------------------

const optionalEnvValue = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

const requiredEnvValue = (
  name: keyof ImportMetaEnv,
  value: string | undefined,
) => {
  const trimmedValue = optionalEnvValue(value);
  if (!trimmedValue) {
    throw new Error(`${name} is required.`);
  }

  return trimmedValue;
};

const networkToChain = {
  localhost: hardhat,
  sepolia,
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
  sepolia: 12,
  base: 2,
  base_sepolia: 2,
};

export const targetAverageBlockTimeSeconds =
  networkToAverageBlockTimeSeconds[networkName];

export const privyAppId = optionalEnvValue(import.meta.env.VITE_PRIVY_APP_ID);
export const privyAppClientId = import.meta.env.VITE_PRIVY_APP_CLIENT_ID;
const isGasSponsorshipRequested =
  import.meta.env.VITE_ENABLE_GAS_SPONSORSHIP === "true";
export const isGasSponsorshipEnabled =
  isGasSponsorshipRequested && targetChain.id === baseSepolia.id;
export const alchemyGasPolicyId = optionalEnvValue(
  import.meta.env.VITE_ALCHEMY_GAS_POLICY_ID,
);
export const smartWalletsConfig =
  isGasSponsorshipEnabled && alchemyGasPolicyId
    ? { paymasterContext: { policyId: alchemyGasPolicyId } }
    : undefined;

const networkToRpcEnv = {
  localhost: ["VITE_LOCALHOST_RPC_URL", import.meta.env.VITE_LOCALHOST_RPC_URL],
  sepolia: ["VITE_SEPOLIA_RPC_URL", import.meta.env.VITE_SEPOLIA_RPC_URL],
  base: ["VITE_BASE_RPC_URL", import.meta.env.VITE_BASE_RPC_URL],
  base_sepolia: [
    "VITE_BASE_SEPOLIA_RPC_URL",
    import.meta.env.VITE_BASE_SEPOLIA_RPC_URL,
  ],
} satisfies Record<NetworkName, [keyof ImportMetaEnv, string | undefined]>;

const [targetRpcEnvName, targetRpcEnvValue] = networkToRpcEnv[networkName];
const targetRpcUrl = requiredEnvValue(targetRpcEnvName, targetRpcEnvValue);

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
