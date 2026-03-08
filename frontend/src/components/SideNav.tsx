import { FC, useState } from "react";
import {
  Avatar,
  Box,
  Button,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Typography,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "@mui/material/styles";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArticleIcon from "@mui/icons-material/Article";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import CreateIcon from "@mui/icons-material/Create";
import { useUserVotes } from "../state/UserVotes";
import ChooseForumModal, { FORUMS } from "./ChooseForumModal";
import { useForum } from "../state/Forum";

// ── Mic icon SVG (shared with AppBar) ─────────────────────────────────────
const MIC_ICON = (
  <svg
    fill="currentColor"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 383 383"
  >
    <g>
      <path d="M348.476,64.279c0-35.5-28.781-64.279-64.275-64.279c-15.541,0-29.775,5.52-40.892,14.705 c4.969,16.941,14.627,33.927,28.717,48.696c18.767,19.641,42.903,32.382,66.291,35.434 C344.721,88.851,348.476,77.021,348.476,64.279z" />
      <path d="M266.356,68.833c-13.931-14.593-23.692-31.29-29.271-48.165c-8.015,8.652-13.602,19.496-15.886,31.512 c6.071,17.232,16.956,33.656,31.69,47.364c13.786,12.818,29.731,22.107,46.09,27.216c13.565-3.186,25.455-10.629,34.188-20.898 C309.332,101.687,285.226,88.592,266.356,68.833z" />
      <path d="M118.311,340.647c-12.066,10.015-51.748,7.069-73.949,2.886c-4.248-0.846-8.354,1.991-9.169,6.256 c-0.793,4.26,1.994,8.371,6.255,9.169c3.635,0.688,23.033,4.184,43.351,4.184c16.584,0,33.796-2.328,43.528-10.396 c5.723-4.713,8.725-11.116,8.725-18.454c0-21.027-12.822-30.949-23.121-38.96c-9.748-7.559-15.747-12.724-16.164-23.243 c-0.519-13.369,4.695-22.378,9.69-27.912c11.664,10.331,34.099,7.947,50.594-5.614l23.612-19.38 c3.072,3.879,7.372,6.732,12.389,7.774v122.876c-35.971,1.286-63.492,8.279-63.492,16.743c0,9.369,33.685,16.959,75.268,16.959 c41.581,0,75.268-7.59,75.268-16.959c0-8.464-27.523-15.457-63.494-16.743V215.471c1.451-2.897,2.332-6.104,2.332-9.538 c0-5.325-2.008-10.118-5.213-13.873l73.973-60.692c-14.643-5.761-28.749-14.555-41.152-26.077 c-13.324-12.405-23.695-26.96-30.496-42.36l-60.063,73.869c-5.853-2.495-12.894-1.318-17.521,3.573 c-5.244,5.504-5.708,13.833-1.499,19.825l-27.154,33.394c-9.123,11.226-12.804,24.902-10.922,36.035 c-8.157,7.249-18.659,20.959-17.805,43.067c0.725,18.37,12.635,27.607,22.217,35.037c9.521,7.39,17.054,13.232,17.054,26.554 C121.351,336.985,120.447,338.884,118.311,340.647z" />
    </g>
  </svg>
);

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
  const { name: forumName, setForum } = useForum();

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
        {/* Logo + Forum selector */}
        <Box sx={{ mb: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Link to="/" style={{ textDecoration: "none" }}>
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ color: "primary.main", cursor: "pointer" }}
              >
                <Box
                  sx={{
                    height: "2rem",
                    width: "2rem",
                    flexShrink: 0,
                  }}
                >
                  {MIC_ICON}
                </Box>
                <Typography
                  component="div"
                  sx={{
                    fontFamily: "Sriracha",
                    fontWeight: "bold",
                    color: "primary.main",
                    whiteSpace: "nowrap",
                    fontSize: "1.625rem",
                  }}
                >
                  Our Voice
                </Typography>
              </Stack>
            </Link>

            <IconButton
              size="medium"
              onClick={() => setChooseForumModalOpen(true)}
              color="inherit"
            >
              <Avatar
                src={FORUMS[forumName]?.iconSrc}
                variant="rounded"
                style={{ height: "1.7rem", width: "1.7rem" }}
              />
            </IconButton>
          </Stack>
        </Box>

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
        }}
      />
    </>
  );
};

export default SideNav;
