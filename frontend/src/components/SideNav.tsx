import { FC, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import { useAccount } from "wagmi";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArticleIcon from "@mui/icons-material/Article";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CreateIcon from "@mui/icons-material/Create";
import WriteModal from "./WriteModal";
import { useUserVotes } from "../state/UserVotes";
import useLocalStorageSet from "@/hooks/useLocalStorageSet";
import { metamaskIcon } from "../util";

const NAV_ITEMS = [
  { label: "Home", href: "/top", icon: <HomeIcon /> },
  { label: "Your Support", href: "/my-support", icon: <FavoriteBorderIcon /> },
  { label: "My Statements", href: "/my-statements", icon: <ArticleIcon /> },
  { label: "Bookmarked", href: "/bookmarked", icon: <BookmarkBorderIcon /> },
  { label: "How it works", href: "#", icon: <HelpOutlineIcon /> },
];

const SideNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const theme = useTheme();
  const { address } = useAccount();
  const userVotes = useUserVotes();
  const { isUserVerified } = userVotes;
  const { add: addAuthoredStatement } =
    useLocalStorageSet("authoredStatements");

  const [writeModalOpen, setWriteModalOpen] = useState(false);

  const avatar = useMemo(() => {
    if (address) return metamaskIcon(address);
    return null;
  }, [address]);

  const unallocatedCredits = isUserVerified
    ? (userVotes.state?.staged?.credits ?? 0)
    : null;

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
        {/* User profile */}
        {address && (
          <Box sx={{ px: 1, pb: 2 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar
                src={avatar ?? undefined}
                sx={{ width: 36, height: 36 }}
              />
              <Stack spacing={0}>
                <Typography variant="body1" fontWeight={600}>
                  mitrydoug
                </Typography>
                {unallocatedCredits !== null && (
                  <Typography variant="body2" color="text.secondary">
                    Credits: {unallocatedCredits}
                  </Typography>
                )}
              </Stack>
            </Stack>
          </Box>
        )}

        <List disablePadding>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href !== "#" &&
              (location.pathname === item.href ||
                (item.href === "/top" && location.pathname === "/"));

            return (
              <ListItemButton
                key={item.label}
                selected={isActive}
                onClick={() => {
                  if (item.href !== "#") navigate(item.href);
                }}
                disabled={item.href === "#"}
                sx={{ borderRadius: 2, mb: 0.5 }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontWeight: isActive ? 600 : 400 }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ px: 1, mt: 2 }}>
          <Button
            fullWidth
            startIcon={<CreateIcon />}
            onClick={() => setWriteModalOpen(true)}
            disabled={!isUserVerified}
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
