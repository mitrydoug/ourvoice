import { Buffer } from 'buffer';
// Polyfill Buffer for environments that do not have it (like browsers)
window.Buffer = Buffer;
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { WagmiProvider } from "@web3auth/modal/react/wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { Web3AuthProvider } from '@web3auth/modal/react'
import web3AuthContextConfig from './web3authContext'

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3AuthProvider config={web3AuthContextConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiProvider>
          <App />
        </WagmiProvider>
      </QueryClientProvider>
    </Web3AuthProvider>
  </React.StrictMode>,
);