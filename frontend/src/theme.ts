import { createTheme } from "@mui/material";

export const theme = createTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#4D7EA8",
        },
        secondary: {
          main: "#dc004e",
        },
        background: {
          default: "#F4F4F4",
        },
        text: {
          primary: "#323232ff",
        },
      },
    },
    dark: true,
  },
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiButton: {
      defaultProps: {
        variant: "contained",
        size: "small",
        sx: { textTransform: "none" },
      },
    },
  },
});
