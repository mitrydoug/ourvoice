import { Buffer } from "buffer";
// Polyfill Buffer for environments that do not have it (like browsers)
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
import React from "react";
import ReactDOM from "react-dom/client";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import App from "./App";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import wagmiConfig, { targetChain } from "./wagmiConfig";
import NetworkGuard from "./components/NetworkGuard";
import { THEME_MODE_STORAGE_KEY } from "./theme";
import "@rainbow-me/rainbowkit/styles.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InitColorSchemeScript
      defaultMode="system"
      modeStorageKey={THEME_MODE_STORAGE_KEY}
    />
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
