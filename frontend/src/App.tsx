import { FC } from "react";

import { createHashRouter, RouterProvider } from "react-router-dom";
import Top from "./components/Top.tsx";

import Root from "./components/Root.tsx";
import MySupport from "./components/MySupport.tsx";
import MyStatements from "./components/MyStatements.tsx";
import Bookmarked from "./components/Bookmarked.tsx";
import { UserVoteProvider } from "./state/UserVotes.tsx";
import { CssBaseline, ThemeProvider } from "@mui/material";
import GetVerified from "./components/GetVerified.tsx";

import { theme } from "./theme.ts";
import { ForumProvider } from "./state/Forum.tsx";
import Account from "./components/Account.tsx";

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
        {
          path: "/my-statements",
          Component: MyStatements,
        },
        {
          path: "/bookmarked",
          Component: Bookmarked,
        },
        {
          path: "/account",
          Component: Account,
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
