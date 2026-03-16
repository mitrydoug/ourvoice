import { Buffer } from "buffer";
// Polyfill Buffer for environments that do not have it (like browsers)
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import wagmiConfig, { targetChain } from "./wagmiConfig";
import NetworkGuard from "./components/NetworkGuard";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider initialChain={targetChain}>
          <NetworkGuard>
            <App />
          </NetworkGuard>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>,
);
