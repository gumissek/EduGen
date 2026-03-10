import { createTheme, ThemeOptions } from '@mui/material/styles';

const commonPalette = {
  primary: {
    main: '#014883',
    light: '#2F6EA3',
    dark: '#012F57',
  },
  success: {
    main: '#21AE4C',
    light: '#4BC773',
    dark: '#17863A',
  },
  warning: {
    main: '#FFC107',
    light: '#FFD54F',
    dark: '#FFB300',
  },
  error: {
    main: '#E53935',
    light: '#EF5350',
    dark: '#C62828',
  },
};

const baseThemeOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontSize: '2.5rem', fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontSize: '2rem', fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontSize: '1.75rem', fontWeight: 600 },
    h4: { fontSize: '1.5rem', fontWeight: 600 },
    h5: { fontSize: '1.25rem', fontWeight: 600 },
    h6: { fontSize: '1rem', fontWeight: 600 },
    button: { textTransform: 'none', fontWeight: 500 },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '12px',
          padding: '8px 24px',
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          '&:active': {
            transform: 'translateY(0)',
          }
        },
        contained: {
          '&:hover': {
            boxShadow: '0 6px 16px rgba(1, 72, 131, 0.2)',
          }
        }
      },
      defaultProps: {
        disableElevation: true,
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: '16px',
        },
        elevation1: {
          boxShadow: '0px 2px 12px rgba(0, 0, 0, 0.04)',
        },
        elevation2: {
          boxShadow: '0px 4px 24px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.2s ease-in-out',
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            transition: 'all 0.2s ease-in-out',
            backgroundColor: 'var(--mui-palette-background-paper)',
            '&:hover fieldset': {
              borderColor: '#2F6EA3',
            },
            '&.Mui-focused fieldset': {
              borderWidth: '2px',
            },
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '20px',
          boxShadow: '0px 8px 32px rgba(0, 0, 0, 0.08)',
        }
      }
    }
  },
};

export const lightTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'light',
    ...commonPalette,
    background: {
      default: '#F5F7FA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A202C',
      secondary: '#4A5568',
    },
    divider: '#E2E8F0',
  },
});

export const darkTheme = createTheme({
  ...baseThemeOptions,
  palette: {
    mode: 'dark',
    ...commonPalette,
    // Slightly lighter primary for better dark mode contrast
    primary: {
      main: '#2F6EA3',
      light: '#578FBD',
      dark: '#014883',
    },
    background: {
      default: '#0F172A',
      paper: '#1E293B',
    },
    text: {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    },
    divider: '#334155',
  },
});
