import React, { FC, useRef, useState } from "react";
import Box from "@mui/material/Box";
import { Outlet } from "react-router-dom";
import { Container } from "@mui/material";

import WriteModal from "./WriteModal";
import MenuAppBar from "./AppBar";

const Root: FC = () => {
  const layoutRef = useRef<HTMLDivElement>(null);

  const [writeModalOpen, setWriteModalOpen] = useState(false);

  return (
    <>
      <Box ref={layoutRef} sx={{ position: "relative" }}>
        <Container
          component="main"
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            minHeight: "100vh",
            overflowY: "auto",
            overflowX: "visible",
            pb: 8,
          }}
        >
          <MenuAppBar />
          <Outlet />
        </Container>
      </Box>
      <WriteModal
        open={writeModalOpen}
        onClose={() => setWriteModalOpen(false)}
      />
    </>
  );
};

export default Root;
