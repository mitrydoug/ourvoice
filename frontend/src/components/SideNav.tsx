import React, { FC, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArticleIcon from "@mui/icons-material/Article";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CreateIcon from "@mui/icons-material/Create";
import WriteModal from "./WriteModal";
import { useUserVotes } from "../state/UserVotes";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import UserProfilePill from "./UserProfilePill";
import { useAccount, useDisconnect } from "wagmi";
import { AccountMenu } from "./UserProfileMenu";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: <HomeIcon /> },
  { label: "My Support", href: "/my-support", icon: <FavoriteBorderIcon /> },
  { label: "My Statements", href: "/my-statements", icon: <ArticleIcon /> },
  { label: "Bookmarked", href: "/bookmarked", icon: <BookmarkBorderIcon /> },
  { label: "How it works", href: "#", icon: <HelpOutlineIcon /> },
];

const SideNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { isUserVerified } = useUserVotes();
  const { address } = useAccount();
  const { disconnect: doDisconnect } = useDisconnect();
  const { add: addAuthoredStatement } =
    useLocalStorageSet("authoredStatements");

  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);

  return (
    <>
      <Box
        component="nav"
        sx={{
          width: theme.custom.sideNav.width,
          flexShrink: 0,
          position: "sticky",
          top: 0,
          alignSelf: "flex-start",
        }}
      >
        {/* User profile pill */}
        {address && (
          <Box sx={{ mb: 2 }}>
            <UserProfilePill
              onOpenMenu={(e: React.MouseEvent<HTMLElement>) =>
                setMenuAnchorEl(e.currentTarget)
              }
            />
            <AccountMenu
              anchorEl={menuAnchorEl}
              open={Boolean(menuAnchorEl)}
              onClose={() => setMenuAnchorEl(null)}
              isUserVerified={isUserVerified}
              navigate={(path: string) => void navigate(path)}
              disconnect={doDisconnect}
            />
          </Box>
        )}

        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href !== "#" && location.pathname === item.href;

            return (
              <ListItemButton
                key={item.label}
                selected={isActive}
                onClick={() => {
                  if (item.href !== "#") void navigate(item.href);
                }}
                disabled={item.href === "#"}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{ primary: { fontWeight: isActive ? 600 : 400 } }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ px: 1, mt: 2 }}>
          <Button
            fullWidth
            size="medium"
            startIcon={<CreateIcon />}
            onClick={() => setWriteModalOpen(true)}
            disabled={!isUserVerified}
            sx={{ borderRadius: 100, py: 1 }}
          >
            Write
          </Button>
        </Box>
      </Box>

      <WriteModal
        open={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
        onStatementAdded={addAuthoredStatement}
      />
    </>
  );
};

export default SideNav;
