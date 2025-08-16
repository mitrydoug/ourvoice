import React, { useState } from 'react';
import Box from '@mui/material/Box';
import RestoreIcon from '@mui/icons-material/Restore';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import Paper from '@mui/material/Paper';
import CssBaseline from '@mui/material/CssBaseline';
import { createHashRouter, RouterProvider } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import EmployeeList from './components/EmployeeList';
import {
  dataGridCustomizations,
  datePickersCustomizations,
  sidebarCustomizations,
  formInputCustomizations,
} from './theme/customizations';
import NotificationsProvider from './hooks/useNotifications/NotificationsProvider';
import DialogsProvider from './hooks/useDialogs/DialogsProvider';
import AppTheme from './shared-theme/AppTheme';



const STATEMENTS = [
    "Dogs are better than cats",
    "We're not prepared for AI",
    "The Earth is flat",
    "Pineapple belongs on pizza",
    "The best superhero is Batman",
]

const router = createHashRouter([
  {
    Component: DashboardLayout,
    children: [
      {
        path: '/employees',
        Component: EmployeeList,
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
    return (
        <AppTheme themeComponents={themeComponents}>
        <CssBaseline enableColorScheme />
        <NotificationsProvider>
            <DialogsProvider>
            <RouterProvider router={router} />
            </DialogsProvider>
        </NotificationsProvider>
        </AppTheme>
    );
}