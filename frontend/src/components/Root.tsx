import { FC, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Container, Fab } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CreateIcon from "@mui/icons-material/Create";

import MenuAppBar from "./AppBar";
import SideNav from "./SideNav";
import BottomNav from "./BottomNav";
import CreateStatementModal from "./CreateStatementModal";
import useIsMobile from "@/hooks/useIsMobile";
import { useUserVotes } from "../state/UserVotes";
import { SearchProvider } from "@/state/Search";

const Root: FC = () => {
  const layoutRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const theme = useTheme();
  const { isUserVerified } = useUserVotes();
  const [writeModalOpen, setWriteModalOpen] = useState(false);

  return (
    <SearchProvider>
      <Box
        ref={layoutRef}
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <MenuAppBar />

        <Container
          component="main"
          maxWidth={false}
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile
              ? theme.custom.layout.contentGap.mobile
              : theme.custom.layout.contentGap.desktop,
            flex: 1,
            maxWidth: isMobile ? undefined : "1000px",
            overflowY: "auto",
            overflowX: "visible",
            pt: isMobile ? 2 : 3,
            pb: isMobile ? 14 : 8,
            /* Hide scrollbar but keep scrolling */
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
          }}
        >
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

        {/* Mobile FAB for Write */}
        {isMobile && (
          <>
            <Fab
              color="primary"
              aria-label="write"
              onClick={() => setWriteModalOpen(true)}
              disabled={!isUserVerified}
              sx={{
                position: "fixed",
                bottom: 80,
                right: 24,
                zIndex: 1201,
              }}
            >
              <CreateIcon />
            </Fab>
            <CreateStatementModal
              open={writeModalOpen}
              onClose={() => setWriteModalOpen(false)}
            />
          </>
        )}
      </Box>
    </SearchProvider>
  );
};

export default Root;
