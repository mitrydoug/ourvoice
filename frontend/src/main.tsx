import { Buffer } from "buffer";
// Polyfill Buffer for environments that do not have it (like browsers)
(window as unknown as { Buffer: typeof Buffer }).Buffer = Buffer;
import React from "react";
import ReactDOM from "react-dom/client";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import App from "./App";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { WagmiProvider } from "@privy-io/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import wagmiConfig, {
  privyAppClientId,
  privyAppId,
  privyConfig,
  smartWalletsConfig,
} from "./wagmiConfig";
import NetworkGuard from "./components/NetworkGuard";
import { THEME_MODE_STORAGE_KEY } from "./theme";

const queryClient = new QueryClient();

const app = !privyAppId ? (
  <div style={{ padding: 24, fontFamily: "sans-serif" }}>
    Missing VITE_PRIVY_APP_ID. Add your Privy app ID to the frontend environment
    to enable wallet login.
  </div>
) : (
  <PrivyProvider
    appId={privyAppId}
    clientId={privyAppClientId}
    config={privyConfig}
  >
    <SmartWalletsProvider config={smartWalletsConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig}>
          <NetworkGuard>
            <App />
          </NetworkGuard>
        </WagmiProvider>
      </QueryClientProvider>
    </SmartWalletsProvider>
  </PrivyProvider>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <InitColorSchemeScript
      defaultMode="system"
      modeStorageKey={THEME_MODE_STORAGE_KEY}
    />
    {app}
  </React.StrictMode>,
);
