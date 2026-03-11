import { FC } from "react";

import { createHashRouter, RouterProvider } from "react-router-dom";
import Home from "./components/Home.tsx";

import Root from "./components/Root.tsx";
import MySupport from "./components/MySupport.tsx";
import MyStatements from "./components/MyStatements.tsx";
import Starred from "./components/Starred.tsx";
import CreateStatementForm from "./components/CreateStatementForm.tsx";
import { UserVoteProvider } from "./state/UserVotes.tsx";
import { CssBaseline, ThemeProvider } from "@mui/material";
import GetVerified from "./components/GetVerified.tsx";
import StatementPage from "./components/StatementPage.tsx";

import { theme } from "./theme.ts";
import { ForumProvider } from "./state/Forum.tsx";
import Profile from "./components/UserProfile.tsx";

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
          Component: Home,
          index: true,
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
          path: "/starred",
          Component: Starred,
        },
        {
          path: "/profile",
          Component: Profile,
        },
        {
          path: "/write",
          Component: CreateStatementForm,
        },
        {
          path: "/statement/:statementId",
          Component: StatementPage,
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
