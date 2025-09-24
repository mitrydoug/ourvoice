import React, { FC, useEffect } from 'react';

import { createHashRouter, RouterProvider } from 'react-router-dom';
import Top from './components/Top.tsx';

import Root from "./components/Root.tsx";
import { useWeb3AuthConnect } from '@web3auth/modal/react';
import MySupport from './components/MySupport.tsx';
import { UserVoteProvider } from './context/UserVoteContext.tsx';


export const App: FC = () => {

  const { connect, isConnected, loading: connectLoading, error: connectError } = useWeb3AuthConnect();

  useEffect(() => {
      connect();
      console.log("Connecting to wallet...");
  }, [isConnected, connectLoading, connectError, connect, 2]);

  const router = createHashRouter([
    {
      Component: Root,
      children: [
        {
          Component: Top,
          index: true,
        },
        {
          path: "/top",
          Component: Top,
        },
        {
          path: "/my-support",
          Component: MySupport,
        }
      ],
    },
  ]);

  return (
    <UserVoteProvider>
      <RouterProvider router={router} />
    </UserVoteProvider>
  );
}

export default App;