import { FC, useState } from "react";
import {
  Box,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ArticleIcon from "@mui/icons-material/Article";
import StarIcon from "@mui/icons-material/Star";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CreateIcon from "@mui/icons-material/Create";
import { useUserVotes } from "../state/UserVotes";
import ChooseForumModal, { FORUMS } from "./ChooseForumModal";
import ForumIcon from "./ForumIcon";
import { useForum, forumToSlug } from "../state/Forum";
import { useForumNavigate, useForumPath } from "../hooks/useForumNavigate";

const NAV_ITEMS = [
  { label: "Home", href: "/", icon: <HomeIcon />, memberOnly: false },
  {
    label: "My Support",
    href: "/my-support",
    icon: <FavoriteIcon />,
    memberOnly: true,
  },
  {
    label: "My Statements",
    href: "/my-statements",
    icon: <ArticleIcon />,
    memberOnly: true,
  },
  {
    label: "Starred",
    href: "/starred",
    icon: <StarIcon sx={{ color: "text.secondary" }} />,
    memberOnly: false,
  },
  {
    label: "How it works",
    href: "#",
    icon: <HelpOutlineIcon />,
    memberOnly: false,
  },
];

const SideNav: FC = () => {
  const location = useLocation();
  const navigate = useForumNavigate();
  const rawNavigate = useNavigate();
  const theme = useTheme();
  const { isUserVerified, isVerifiedLoading } = useUserVotes();
  const { name: forumName, setForum } = useForum();
  const forumPath = useForumPath();

  const [chooseForumModalOpen, setChooseForumModalOpen] = useState(false);

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
        {/* Logo */}
        <Box sx={{ mb: 0, display: "flex", justifyContent: "center" }}>
          <Link to={forumPath("/")} style={{ textDecoration: "none" }}>
            <img
              src="./symvolia-logo.svg"
              alt="Symvolia"
              style={{ height: "3.1rem", width: "auto" }}
            />
          </Link>
        </Box>

        {/* Forum selector — centered between logo and nav list */}
        <Box
          sx={{
            mt: 0.5,
            mb: 2.5,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <Box
            onClick={() => setChooseForumModalOpen(true)}
            sx={{ cursor: "pointer", display: "flex", alignItems: "center" }}
          >
            {FORUMS[forumName] && (
              <ForumIcon forum={FORUMS[forumName]} size="1.8rem" />
            )}
          </Box>
        </Box>

        <List disablePadding>
          {NAV_ITEMS.filter(
            (item) => !item.memberOnly || isUserVerified || isVerifiedLoading,
          ).map(
            (item) => {
              const isActive =
                item.href !== "#" && location.pathname === forumPath(item.href);

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
                    slotProps={{
                      primary: { fontWeight: isActive ? 600 : 400 },
                    }}
                  />
                </ListItemButton>
              );
            },
          )}
        </List>

        <Box sx={{ px: 1, mt: 2 }}>
          <Button
            fullWidth
            size="medium"
            startIcon={<CreateIcon />}
            onClick={() => void navigate("/write")}
            disabled={!isUserVerified}
            sx={{ borderRadius: 100, py: 1 }}
          >
            Write
          </Button>
        </Box>
      </Box>

      <ChooseForumModal
        open={chooseForumModalOpen}
        onClose={() => setChooseForumModalOpen(false)}
        chooseForum={(forum: string) => {
          setForum(forum);
          setChooseForumModalOpen(false);
          const slug = forumToSlug(forum);
          void rawNavigate(`/${slug}`);
        }}
      />
    </>
  );
};

export default SideNav;
