import { createTheme, ThemeOptions } from "@mui/material/styles";

const commonPalette = {
  primary: {
    main: "#0A5CAD",
    light: "#3A7CC7",
    dark: "#063B6F",
  },
  success: {
    main: "#22C55E",
    light: "#4ADE80",
    dark: "#16A34A",
  },
  warning: {
    main: "#FACC15",
    light: "#FDE047",
    dark: "#EAB308",
  },
  error: {
    main: "#EF4444",
    light: "#ff8686",
    veryLight: "#FEE2E2",
    dark: "#DC2626",
  },
  white: {
    main: "#FFFFFF",
    light: "#FFFFFF",
    dark: "#FFFFFF",
  },
};

const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: "2.5rem",
      fontWeight: 800,
      letterSpacing: "-0.03em",
      lineHeight: 1.2,
    },
    h2: {
      fontSize: "2rem",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.3,
    },
    h3: {
      fontSize: "1.75rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h4: {
      fontSize: "1.5rem",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.4,
    },
    h5: { fontSize: "1.25rem", fontWeight: 600, lineHeight: 1.5 },
    h6: { fontSize: "1rem", fontWeight: 600, lineHeight: 1.5 },
    button: { textTransform: "none", fontWeight: 600, letterSpacing: "0.01em" },
    body1: { lineHeight: 1.6 },
    body2: { lineHeight: 1.5 },
  },

  shape: {
    borderRadius: 16,
  },

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: "12px",
          padding: "10px 24px",
          fontWeight: 600,
          boxShadow: "none",
          transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",

          "&:hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 10px 28px rgba(59,130,246,0.25)",
          },

          "&:active": {
            transform: "translateY(0)",
          },

          "&.Mui-focusVisible": {
            outline: "3px solid #3B82F6",
            outlineOffset: "2px",
          },
        },

        contained: {
          "&:hover": {
            boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
          },
        },

        outlined: {
          borderWidth: "2px",

          "&:hover": {
            borderWidth: "2px",
            backgroundColor: "rgba(59,130,246,0.05)",
          },
        },
      },

      defaultProps: {
        disableElevation: true,
      },
    },

    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },

        rounded: {
          borderRadius: "20px",
        },

        elevation1: {
          boxShadow: "0px 4px 16px rgba(0,0,0,0.04)",
        },

        elevation2: {
          boxShadow: "0px 10px 28px rgba(0,0,0,0.08)",
        },
      },
    },

    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: "20px",
          boxShadow: "0px 10px 28px rgba(0,0,0,0.08)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",

          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0px 16px 40px rgba(0,0,0,0.15)",
          },
        },
      },
    },

    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: "14px",
            transition: "all 0.25s ease-in-out",
            backgroundColor: "var(--mui-palette-background-paper)",

            "&:hover fieldset": {
              borderColor: "#3B82F6",
            },

            "&.Mui-focused fieldset": {
              borderWidth: "2px",
              borderColor: "#3B82F6",
            },

            "&.Mui-focused": {
              boxShadow: "0 0 0 4px rgba(59,130,246,0.2)",
            },
          },
        },
      },
    },

    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: "24px",
          boxShadow: "0px 20px 60px rgba(0,0,0,0.2)",
        },
      },
    },

    MuiStepLabel: {
      styleOverrides: {
        root: {
          // Etykieta "Nie dotyczy" dla pominiętych kroków
          ".step-not-applicable": {
            fontSize: "11px",
            fontWeight: 600,
            color: "var(--mui-palette-error-main)",
            letterSpacing: "0.02em",
          },
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...baseThemeOptions,

  palette: {
    mode: "light",

    ...commonPalette,

    background: {
      default: "#F8FAFC",
      paper: "#FFFFFF",
    },

    text: {
      primary: "#0F172A",
      secondary: "#475569",
    },

    divider: "#E2E8F0",
  },
});

export const darkTheme = createTheme({
  ...baseThemeOptions,

  palette: {
    mode: "dark",

    primary: {
      main: "#3B82F6",
      light: "#60A5FA",
      dark: "#1D4ED8",
    },

    success: {
      main: "#22C55E",
      light: "#4ADE80",
      dark: "#15803D",
    },

    warning: {
      main: "#FACC15",
      light: "#FDE047",
      dark: "#CA8A04",
    },

    error: {
      main: "#F87171",
      light: "#FCA5A5",
      dark: "#DC2626",
    },

    background: {
      default: "#020617",
      paper: "#0F172A",
    },

    text: {
      primary: "#F1F5F9",
      secondary: "#CBD5F5",
    },

    divider: "#1E293B",
  },
});
