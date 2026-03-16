import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat, type Chain } from "wagmi/chains";
import { http } from "wagmi";

// ---------------------------------------------------------------------------
// Derive the single target chain from VITE_NETWORK.  Every deployment is
// confined to exactly one chain — this also locks the RainbowKit chain
// selector so users cannot switch to an unsupported network from the UI.
// ---------------------------------------------------------------------------

const networkName = import.meta.env.VITE_NETWORK ?? "localhost";

const networkToChain: Record<string, Chain> = {
  localhost: hardhat,
  compose_hardhat_forked: hardhat,
  sepolia,
};

export const targetChain: Chain = networkToChain[networkName] ?? sepolia;

const wagmiConfig = getDefaultConfig({
  appName: "Symvolia",
  // Get a free projectId at https://cloud.walletconnect.com
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
  chains: [targetChain] as const,
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
    ),
  },
});

export default wagmiConfig;
