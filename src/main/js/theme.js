import { createTheme } from '@mui/material/styles';

// 統一的陰影層級：更柔和、更一致
const softShadow = {
  xs: '0 1px 2px rgba(15, 23, 42, 0.04)',
  sm: '0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)',
  md: '0 4px 12px rgba(15, 23, 42, 0.06), 0 2px 4px rgba(15, 23, 42, 0.04)',
  lg: '0 12px 24px rgba(15, 23, 42, 0.08), 0 4px 8px rgba(15, 23, 42, 0.04)',
};

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#475569',
      light: '#64748b',
      dark: '#334155',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f7f8fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
      disabled: '#94a3b8',
    },
    divider: 'rgba(15, 23, 42, 0.08)',
    grey: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
  },
  typography: {
    fontFamily: [
      'Inter',
      'Noto Sans TC',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700,
      lineHeight: 1.25,
      letterSpacing: '-0.015em',
    },
    h3: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h4: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: '-0.005em',
    },
    h5: {
      fontSize: '1.125rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 600,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      lineHeight: 1.6,
    },
    body2: {
      fontSize: '0.875rem',
      fontWeight: 400,
      lineHeight: 1.55,
    },
    caption: {
      fontSize: '0.75rem',
      fontWeight: 400,
      lineHeight: 1.5,
      letterSpacing: '0.01em',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
      letterSpacing: '0.005em',
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 10,
  },
  spacing: 8,
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1200,
      xl: 1536,
    },
  },
  customShadows: softShadow,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f7f8fa',
        },
        '*::-webkit-scrollbar': {
          width: 10,
          height: 10,
        },
        '*::-webkit-scrollbar-track': {
          backgroundColor: 'transparent',
        },
        '*::-webkit-scrollbar-thumb': {
          backgroundColor: 'rgba(15, 23, 42, 0.15)',
          borderRadius: 8,
          border: '2px solid transparent',
          backgroundClip: 'content-box',
        },
        '*::-webkit-scrollbar-thumb:hover': {
          backgroundColor: 'rgba(15, 23, 42, 0.25)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          fontWeight: 500,
          padding: '8px 16px',
        },
        sizeSmall: {
          padding: '4px 12px',
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: softShadow.sm,
          },
        },
        outlined: {
          borderColor: 'rgba(15, 23, 42, 0.12)',
          '&:hover': {
            borderColor: 'rgba(15, 23, 42, 0.24)',
            backgroundColor: 'rgba(15, 23, 42, 0.02)',
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: softShadow.xs,
          backgroundImage: 'none',
          transition: 'border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease',
          '&:hover': {
            boxShadow: softShadow.md,
            borderColor: 'rgba(15, 23, 42, 0.1)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        outlined: {
          borderColor: 'rgba(15, 23, 42, 0.08)',
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          boxShadow: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'saturate(180%) blur(12px)',
          color: '#0f172a',
          borderBottom: '1px solid rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: {
          minHeight: 44,
        },
        indicator: {
          height: 2,
          borderRadius: '2px 2px 0 0',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          minHeight: 44,
          padding: '8px 14px',
          fontWeight: 500,
          fontSize: '0.875rem',
          color: '#64748b',
          '&.Mui-selected': {
            fontWeight: 600,
            color: '#1976d2',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            backgroundColor: '#ffffff',
            '& fieldset': {
              borderColor: 'rgba(15, 23, 42, 0.12)',
            },
            '&:hover fieldset': {
              borderColor: 'rgba(15, 23, 42, 0.24)',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: '#ffffff',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          height: 24,
        },
        sizeSmall: {
          height: 22,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: 'rgba(15, 23, 42, 0.12)',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(15, 23, 42, 0.06)',
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#f8fafc',
          '& .MuiTableCell-root': {
            fontWeight: 600,
            color: '#475569',
            fontSize: '0.8125rem',
            textTransform: 'none',
            borderBottom: '1px solid rgba(15, 23, 42, 0.08)',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(15, 23, 42, 0.04)',
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          fontSize: '0.875rem',
        },
        standardError: {
          backgroundColor: '#fef2f2',
          color: '#991b1b',
        },
        standardWarning: {
          backgroundColor: '#fffbeb',
          color: '#92400e',
        },
        standardInfo: {
          backgroundColor: '#eff6ff',
          color: '#1e40af',
        },
        standardSuccess: {
          backgroundColor: '#f0fdf4',
          color: '#166534',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          fontSize: '0.75rem',
          padding: '6px 10px',
          borderRadius: 6,
        },
      },
    },
  },
});

export default theme;
