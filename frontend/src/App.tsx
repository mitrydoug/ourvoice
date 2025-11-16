import React, { FC, useEffect } from "react";

import { createHashRouter, RouterProvider } from "react-router-dom";
import Top from "./components/Top.tsx";

import Root from "./components/Root.tsx";
import { useWeb3AuthConnect } from "@web3auth/modal/react";
import MySupport from "./components/MySupport.tsx";
import { UserVoteProvider } from "./state/UserVotes.tsx";
import { CssBaseline, ThemeProvider } from "@mui/material";
import GetVerified from "./components/GetVerified.tsx";

import { theme } from "./theme.ts";
import { ForumProvider } from "./state/Forum.tsx";

export const App: FC = () => {
  const router = createHashRouter([
    {
      path: "/verify",
      Component: GetVerified,
    },
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
        },
      ],
    },
  ]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <ForumProvider>
        <UserVoteProvider>
          <RouterProvider router={router} />
        </UserVoteProvider>
      </ForumProvider>
    </ThemeProvider>
  );
};

export default App;
