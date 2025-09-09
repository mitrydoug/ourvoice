import React, { useCallback, useEffect, useState } from 'react';
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

const router = createHashRouter([
  {
    Component: Root,
    children: [
      {
        Component: () => { return <div>Hello World.</div>; },
        index: true,
      }
    ],
  },
]);

export default function App() {

  return (
      <RouterProvider router={router} />
  );
}