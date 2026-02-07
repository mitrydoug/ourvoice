import { FC, useRef } from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Container } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import MenuAppBar from "./AppBar";
import SideNav from "./SideNav";
import useIsMobile from "@/hooks/useIsMobile";

const Root: FC = () => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const theme = useTheme();

  return (
    <Box ref={layoutRef} sx={{ position: "relative" }}>
      <Container
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile
            ? theme.custom.layout.contentGap.mobile
            : theme.custom.layout.contentGap.desktop,
          minHeight: "100vh",
          overflowY: "auto",
          overflowX: "visible",
          pb: 8,
        }}
      >
        <MenuAppBar />

        {isMobile ? (
          <Outlet />
        ) : (
          <Box sx={{ display: "flex", gap: 3 }}>
            <SideNav />
            <Box sx={{ flexGrow: 1, minWidth: 0 }}>
              <Outlet />
            </Box>
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default Root;
