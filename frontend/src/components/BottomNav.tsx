import { FC } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BottomNavigation, BottomNavigationAction, Paper } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import ArticleIcon from "@mui/icons-material/Article";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";

const NAV_ITEMS = [
  { label: "Home", href: "/top", icon: <HomeIcon /> },
  { label: "My Support", href: "/my-support", icon: <FavoriteBorderIcon /> },
  {
    label: "My Statements",
    href: "/my-statements",
    icon: <ArticleIcon />,
  },
  { label: "Bookmarked", href: "/bookmarked", icon: <BookmarkBorderIcon /> },
];

const BottomNav: FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const currentIndex = NAV_ITEMS.findIndex(
    (item) =>
      location.pathname === item.href ||
      (item.href === "/top" && location.pathname === "/"),
  );

  return (
    <Paper
      sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1200 }}
      elevation={3}
    >
      <BottomNavigation
        showLabels
        value={currentIndex === -1 ? false : currentIndex}
        onChange={(_, newValue: number) => {
          navigate(NAV_ITEMS[newValue].href);
        }}
      >
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.label}
            label={item.label}
            icon={item.icon}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
