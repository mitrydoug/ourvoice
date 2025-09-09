import { Buffer } from 'buffer';
// Polyfill Buffer for environments that do not have it (like browsers)
window.Buffer = Buffer;
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';


import { Web3AuthProvider } from '@web3auth/modal/react'
import web3AuthContextConfig from './web3authContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Web3AuthProvider config={web3AuthContextConfig}>
      <App />
    </Web3AuthProvider>
  </React.StrictMode>,
);