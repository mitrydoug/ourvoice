import { createTheme } from "@mui/material";

// Type augmentation for custom theme tokens
declare module "@mui/material/styles" {
  interface Theme {
    custom: {
      appBar: {
        logoIcon: {
          size: {
            mobile: string;
            desktop: string;
          };
        };
        logoText: {
          size: {
            mobile: string;
            desktop: string;
          };
        };
        spacing: {
          mobile: number;
          desktop: number;
        };
      };
      statementList: {
        endIndicatorPadding: number;
      };
      layout: {
        contentGap: {
          mobile: number;
          desktop: number;
        };
      };
      sideNav: {
        width: number;
      };
    };
  }
  interface ThemeOptions {
    custom?: {
      appBar?: {
        logoIcon?: {
          size?: {
            mobile?: string;
            desktop?: string;
          };
        };
        logoText?: {
          size?: {
            mobile?: string;
            desktop?: string;
          };
        };
        spacing?: {
          mobile?: number;
          desktop?: number;
        };
      };
      statementList?: {
        endIndicatorPadding?: number;
      };
      layout?: {
        contentGap?: {
          mobile?: number;
          desktop?: number;
        };
      };
      sideNav?: {
        width?: number;
      };
    };
  }
}

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
      },
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
    MuiAvatar: {
      styleOverrides: {
        root: ({ theme }) => ({
          width: 40,
          height: 40,
          [theme.breakpoints.down("md")]: {
            width: 32,
            height: 32,
          },
        }),
      },
    },
    MuiStack: {
      defaultProps: {
        spacing: 2,
      },
    },
  },
  custom: {
    appBar: {
      logoIcon: {
        size: {
          mobile: "2rem",
          desktop: "2.75rem",
        },
      },
      logoText: {
        size: {
          mobile: "1.8rem",
          desktop: "2.125rem",
        },
      },
      spacing: {
        mobile: 1,
        desktop: 2,
      },
    },
    statementList: {
      endIndicatorPadding: 1,
    },
    layout: {
      contentGap: {
        mobile: 2,
        desktop: 4,
      },
    },
    sideNav: {
      width: 220,
    },
  },
});
