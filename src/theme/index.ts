import { createTheme } from '@mui/material/styles';
import { blue, indigo, teal, orange, red, grey } from '@mui/material/colors';

declare module '@mui/material/styles' {
  interface Theme {
    status: {
      danger: string;
      success: string;
      warning: string;
      info: string;
    };
  }
  
  interface ThemeOptions {
    status?: {
      danger?: string;
      success?: string;
      warning?: string;
      info?: string;
    };
  }

  interface Palette {
    neutral: Palette['primary'];
  }
  
  interface PaletteOptions {
    neutral?: PaletteOptions['primary'];
  }
}

// Create a theme instance
const theme = createTheme({
  palette: {
    primary: {
      main: indigo[700],
      light: indigo[500],
      dark: indigo[900],
      contrastText: '#fff',
    },
    secondary: {
      main: teal[500],
      light: teal[300],
      dark: teal[700],
      contrastText: '#fff',
    },
    error: {
      main: red[500],
    },
    warning: {
      main: orange[500],
    },
    success: {
      main: teal[500],
    },
    info: {
      main: blue[500],
    },
    neutral: {
      main: grey[500],
      light: grey[300],
      dark: grey[700],
      contrastText: '#fff',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  status: {
    danger: red[500],
    success: teal[500],
    warning: orange[500],
    info: blue[500],
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 600,
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.5,
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.5,
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 500,
      lineHeight: 1.5,
      textTransform: 'uppercase',
    },
  },
  shape: {
    borderRadius: 8,
  },
  spacing: 8,
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        sizeLarge: {
          padding: '10px 22px',
          fontSize: '1rem',
        },
        sizeSmall: {
          padding: '6px 12px',
          fontSize: '0.8125rem',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        fullWidth: true,
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiTable: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            fontWeight: 600,
            backgroundColor: grey[50],
          },
        },
      },
    },
  },
});

// Add responsive font sizes
const responsiveTypography = {
  h1: {
    [theme.breakpoints.down('sm')]: {
      fontSize: '2rem',
    },
  },
  h2: {
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.75rem',
    },
  },
  h3: {
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.5rem',
    },
  },
};

theme.typography = {
  ...theme.typography,
  ...responsiveTypography,
} as any;

export default theme;
