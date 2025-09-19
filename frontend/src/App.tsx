import React, { FC, useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import Ranking from './components/Ranking';

import { MetaMaskSDK, type SDKProvider } from "@metamask/sdk";

import AppContext from './context/AppContext';
import { useWallet } from "./hooks/useWallet";
import contractAddress from "./contracts/contract-address.json";
import PolyVoice from "./contracts/PolyVoice.json";
import Root from "./components/Root.tsx";
import { useAccount } from 'wagmi';
import { useWeb3AuthConnect } from '@web3auth/modal/react';

const router = createHashRouter([
  {
    Component: Root,
    children: [
      {
        Component: () => { return <Ranking />; },
        index: true,
      }
    ],
  },
]);

export default function App() {

  const { connect, isConnected, connectorName, loading: connectLoading, error: connectError } = useWeb3AuthConnect();

  console.log("App rendered");
  useEffect(() => {
      connect();
      console.log("Connecting to wallet...");
  }, [isConnected, connectLoading, connectError, connect, 2]);

  return (
      <RouterProvider router={router} />
  );
}