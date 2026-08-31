import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call the onError handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    this.setState({ error, errorInfo });
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="w-full max-w-md">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription className="mb-4">
                {this.state.error?.message || 'An unexpected error occurred'}
              </AlertDescription>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={this.handleReset}
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try again
                </Button>
              </div>
            </Alert>
            
            {import.meta.env.DEV && this.state.errorInfo && (
              <details className="mt-4 p-4 bg-muted/50 rounded-md text-sm overflow-auto max-h-60">
                <summary className="font-medium mb-2 cursor-pointer">Error Details</summary>
                <pre className="text-xs text-muted-foreground overflow-auto">
                  {this.state.error?.stack}
                  <br />
                  <br />
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for functional components
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  return (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
};

// Hook for functional components
export const useErrorBoundary = () => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = (error: Error) => {
    console.error('Error caught by useErrorBoundary:', error);
    setError(error);
  };

  const resetError = () => {
    setError(null);
  };

  return { error, handleError, resetError };
};
