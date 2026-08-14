import i18n from '../../i18n';
import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '50vh',
          p: 3
        }}>
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
            <ErrorIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              {i18n.t('error.boundaryTitle')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              {i18n.t('error.boundaryBody')}
            </Typography>
            <Button
              variant="contained"
              startIcon={<RefreshIcon />}
              onClick={this.handleRefresh}
              size="large"
            >
              {i18n.t('error.reload')}
            </Button>
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;