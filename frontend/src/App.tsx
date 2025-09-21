import React, { FC, useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import Top from './components/Top.tsx';

import { MetaMaskSDK, type SDKProvider } from "@metamask/sdk";

import AppContext from './context/AppContext';
import { useWallet } from "./hooks/useWallet";
import Root from "./components/Root.tsx";
import { useAccount } from 'wagmi';
import { useWeb3AuthConnect } from '@web3auth/modal/react';
import MySupport from './components/MySupport.tsx';

const router = createHashRouter([
  {
    Component: Root,
    children: [
      {
        Component: () => { return <Top />; },
        index: true,
      },
      {
        path: "/top",
        Component: () => { return <Top />; },
      },
      {
        path: "/my-support",
        Component: () => { return <MySupport />; },
      }
    ],
  },
]);

export default function App() {

  const { connect, isConnected, connectorName, loading: connectLoading, error: connectError } = useWeb3AuthConnect();

  useEffect(() => {
      connect();
      console.log("Connecting to wallet...");
  }, [isConnected, connectLoading, connectError, connect, 2]);

  return (
      <RouterProvider router={router} />
  );
}