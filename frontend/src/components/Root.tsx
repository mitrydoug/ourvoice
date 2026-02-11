import { FC, useRef } from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Container } from "@mui/material";
import { useTheme } from "@mui/material/styles";

import MenuAppBar from "./AppBar";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import useIsMobile from "@/hooks/useIsMobile";

const Root: FC = () => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const theme = useTheme();

  return (
    <Box ref={layoutRef} sx={{ position: "relative" }}>
      <Container
        component="main"
        maxWidth={false}
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile
            ? theme.custom.layout.contentGap.mobile
            : theme.custom.layout.contentGap.desktop,
          minHeight: "100vh",
          maxWidth: isMobile ? undefined : "800px",
          overflowY: "auto",
          overflowX: "visible",
          pb: isMobile ? 14 : 8,
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

      {isMobile && <BottomNav />}
    </Box>
  );
};

export default Root;
