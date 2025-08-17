import React, { useCallback, useEffect, useState } from 'react';
import { ethers } from 'ethers';
import Box from '@mui/material/Box';
import RestoreIcon from '@mui/icons-material/Restore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Paper from '@mui/material/Paper';
import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import EmployeeList from './components/EmployeeList';
import Ranking from './components/Ranking';
import {
  dataGridCustomizations,
  datePickersCustomizations,
  sidebarCustomizations,
  formInputCustomizations,
} from './theme/customizations';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import AppTheme from './shared-theme/AppTheme';

import AppContext from './context/AppContext';
import { useWallet } from "./hooks/useWallet";
import contractAddress from "./contracts/contract-address.json";
import PolyVoice from "./contracts/PolyVoice.json";

const router = createHashRouter([
  {
    Component: DashboardLayout,
    children: [
      {
        Component: Ranking,
        index: true,
      }
    ],
  },
]);

const themeComponents = {
  ...dataGridCustomizations,
  ...datePickersCustomizations,
  ...sidebarCustomizations,
  ...formInputCustomizations,
};

export default function App() {
  
  const wallet = useWallet();
  const { provider, walletState, network } = wallet;
  const [polyVoice, setPolyVoice] = useState(null);
  const [connectionRequested, setConnectionRequested] = useState(false);

  useEffect(() => {
      if (provider && walletState === "connected") {
          console.log(contractAddress);
          console.log(network);
          provider.getSigner().then(signer => {
              setPolyVoice(
                  new ethers.Contract(
                      contractAddress.PolyVoice[network],
                      PolyVoice.abi,
                      signer,
                  )
              );
          });
      }
  }, [walletState, network]);

  const requestConnection = useCallback(() => {
      setConnectionRequested(true);
  }, []);

  return (
      <AppTheme themeComponents={themeComponents}>
          <CssBaseline enableColorScheme />
          <NotificationsProvider>
              <AppContext.Provider value={{ polyVoice, wallet, connectionRequested, requestConnection }}>
                <DialogsProvider>
                    <RouterProvider router={router} />
                </DialogsProvider>
              </AppContext.Provider>
          </NotificationsProvider>
      </AppTheme>
  );
}