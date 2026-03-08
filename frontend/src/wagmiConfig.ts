import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { sepolia, hardhat } from "wagmi/chains";
import { http } from "wagmi";

const chains = import.meta.env.DEV
  ? ([hardhat, sepolia] as const)
  : ([sepolia] as const);

const wagmiConfig = getDefaultConfig({
  appName: "Symvolia",
  // Get a free projectId at https://cloud.walletconnect.com
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ?? "YOUR_PROJECT_ID",
  chains,
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(
      import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://rpc.sepolia.org",
    ),
  },
});

export default wagmiConfig;
