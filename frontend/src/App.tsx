import { FC } from "react";

import {
  createHashRouter,
  Navigate,
  RouterProvider,
  useParams,
} from "react-router-dom";
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
import GlobalErrorBoundary, {
  RouteErrorBoundary,
} from "./components/GlobalErrorBoundary.tsx";

import { theme } from "./theme.ts";
import {
  ForumProvider,
  getStoredForumSlug,
  slugToForum,
} from "./state/Forum.tsx";
import Profile from "./components/UserProfile.tsx";

/**
 * Redirects bare `/` to the last-visited forum slug (from localStorage),
 * falling back to the "earth" (global) forum.
 */
const RootRedirect: FC = () => {
  const slug = getStoredForumSlug();
  return <Navigate to={`/${slug}`} replace />;
};

/**
 * Validates the `:forumSlug` param. If the slug is unrecognised, redirects
 * to the stored/default forum.
 */
const ValidateForumSlug: FC = () => {
  const { forumSlug } = useParams<{ forumSlug: string }>();
  const resolved = forumSlug ? slugToForum(forumSlug) : undefined;

  if (!resolved) {
    const fallback = getStoredForumSlug();
    return <Navigate to={`/${fallback}`} replace />;
  }

  return <Root />;
};

/** Routes nested under the Root layout (shared shell). */
const forumChildren = [
  {
    Component: Home,
    index: true,
  },
  {
    path: "my-support",
    Component: MySupport,
  },
  {
    path: "my-statements",
    Component: MyStatements,
  },
  {
    path: "starred",
    Component: Starred,
  },
  {
    path: "profile",
    Component: Profile,
  },
  {
    path: "write",
    Component: CreateStatementForm,
  },
  {
    path: "statement/:statementId",
    Component: StatementPage,
  },
];

const router = createHashRouter([
  {
    path: "/verify",
    Component: GetVerified,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: "/:forumSlug",
    Component: ValidateForumSlug,
    errorElement: <RouteErrorBoundary />,
    children: forumChildren,
  },
  {
    /* Bare "/" redirects to the last-visited forum (localStorage) */
    path: "/",
    Component: RootRedirect,
    errorElement: <RouteErrorBoundary />,
  },
]);

export const App: FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalErrorBoundary>
        <ForumProvider>
          <UserVoteProvider>
            <RouterProvider router={router} />
          </UserVoteProvider>
        </ForumProvider>
      </GlobalErrorBoundary>
    </ThemeProvider>
  );
};

export default App;
