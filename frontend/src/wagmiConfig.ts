import { createConfig } from "@privy-io/wagmi";
import type { PrivyClientConfig } from "@privy-io/react-auth";
import { base, baseSepolia, hardhat, sepolia, type Chain } from "wagmi/chains";
import { http } from "wagmi";

// ---------------------------------------------------------------------------
// Derive the single target chain from VITE_NETWORK.  Every deployment is
// confined to exactly one chain. Privy and the network guard both use this
// target to keep connected wallets on the deployed chain.
// ---------------------------------------------------------------------------

const networkName = import.meta.env.VITE_NETWORK ?? "localhost";

const optionalEnvUrl = (value: string | undefined) => {
  const trimmedValue = value?.trim();
  return trimmedValue === "" ? undefined : trimmedValue;
};

const networkToChain: Record<string, Chain> = {
  localhost: hardhat,
  sepolia,
  base,
  base_sepolia: baseSepolia,
};

export const targetChain: Chain = networkToChain[networkName] ?? sepolia;

const networkToAverageBlockTimeSeconds: Record<string, number> = {
  localhost: 1,
  sepolia: 12,
  base: 2,
  base_sepolia: 2,
};

export const targetAverageBlockTimeSeconds =
  networkToAverageBlockTimeSeconds[networkName] ?? 12;

export const privyAppId = import.meta.env.VITE_PRIVY_APP_ID ?? "";
export const privyAppClientId = import.meta.env.VITE_PRIVY_APP_CLIENT_ID;

const sepoliaRpcUrl =
  optionalEnvUrl(import.meta.env.VITE_SEPOLIA_RPC_URL) ??
  "https://rpc.sepolia.org";
const baseRpcUrl =
  optionalEnvUrl(import.meta.env.VITE_BASE_RPC_URL) ?? "https://mainnet.base.org";
const baseSepoliaRpcUrl =
  optionalEnvUrl(import.meta.env.VITE_BASE_SEPOLIA_RPC_URL) ??
  "https://sepolia.base.org";

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
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(sepoliaRpcUrl),
    [base.id]: http(baseRpcUrl),
    [baseSepolia.id]: http(baseSepoliaRpcUrl),
  },
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}

export default wagmiConfig;
