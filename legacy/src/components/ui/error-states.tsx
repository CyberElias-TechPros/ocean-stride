import React from 'react';
import { Alert, AlertDescription, AlertTitle } from './alert';
import { Button } from './button';
import { AlertCircle, RefreshCw, Wifi, WifiOff, Server, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

// Generic error display
interface ErrorDisplayProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
  variant?: 'default' | 'destructive';
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'Error',
  message,
  onRetry,
  retryLabel = 'Try again',
  className,
  variant = 'destructive'
}) => {
  return (
    <Alert variant={variant} className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        {message}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2 gap-2"
          >
            <RefreshCw className="h-3 w-3" />
            {retryLabel}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};

// Network error
interface NetworkErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const NetworkError: React.FC<NetworkErrorProps> = ({
  onRetry,
  className
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <WifiOff className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Connection Lost</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Unable to connect to the server. Please check your internet connection and try again.
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry Connection
        </Button>
      )}
    </div>
  );
};

// Server error
interface ServerErrorProps {
  statusCode?: number;
  onRetry?: () => void;
  className?: string;
}

export const ServerError: React.FC<ServerErrorProps> = ({
  statusCode,
  onRetry,
  className
}) => {
  const getErrorMessage = (code?: number) => {
    switch (code) {
      case 500:
        return 'Internal server error. Our team has been notified.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. The server is taking too long to respond.';
      default:
        return 'Server error occurred. Please try again.';
    }
  };

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <Server className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Server Error</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        {getErrorMessage(statusCode)}
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Try Again
        </Button>
      )}
    </div>
  );
};

// Database error
interface DatabaseErrorProps {
  onRetry?: () => void;
  className?: string;
}

export const DatabaseError: React.FC<DatabaseErrorProps> = ({
  onRetry,
  className
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <Database className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Database Error</h3>
      <p className="text-muted-foreground mb-4 max-w-sm">
        Unable to access the database. This might be a temporary issue.
      </p>
      {onRetry && (
        <Button onClick={onRetry} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
};

// Form error display
interface FormErrorProps {
  errors: Record<string, string>;
  className?: string;
}

export const FormError: React.FC<FormErrorProps> = ({
  errors,
  className
}) => {
  const errorEntries = Object.entries(errors).filter(([, message]) => message);

  if (errorEntries.length === 0) return null;

  return (
    <Alert variant="destructive" className={className}>
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Validation Errors</AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 mt-2">
          {errorEntries.map(([field, message]) => (
            <li key={field} className="text-sm">
              <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1')}:</span> {message}
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
};

// Inline field error
interface FieldErrorProps {
  error?: string;
  className?: string;
}

export const FieldError: React.FC<FieldErrorProps> = ({
  error,
  className
}) => {
  if (!error) return null;

  return (
    <p className={cn('text-sm text-destructive mt-1', className)}>
      {error}
    </p>
  );
};

// Toast error hook
export function useErrorHandler() {
  const [errors, setErrors] = React.useState<Array<{ id: string; message: string; type: 'error' | 'warning' }>>([]);

  const addError = React.useCallback((message: string, type: 'error' | 'warning' = 'error') => {
    const id = Date.now().toString();
    setErrors(prev => [...prev, { id, message, type }]);
    return id;
  }, []);

  const removeError = React.useCallback((id: string) => {
    setErrors(prev => prev.filter(error => error.id !== id));
  }, []);

  const clearErrors = React.useCallback(() => {
    setErrors([]);
  }, []);

  // Auto-remove errors after 5 seconds
  React.useEffect(() => {
    const timers = errors.map(error => {
      if (error.type === 'error') {
        return setTimeout(() => removeError(error.id), 5000);
      }
      return null;
    });

    return () => {
      timers.forEach(timer => timer && clearTimeout(timer));
    };
  }, [errors, removeError]);

  return {
    errors,
    addError,
    removeError,
    clearErrors
  };
}

// Error boundary for async operations
interface AsyncErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  onError?: (error: Error) => void;
}

export class AsyncErrorBoundary extends React.Component<
  AsyncErrorBoundaryProps,
  { error: Error | null; hasError: boolean }
> {
  constructor(props: AsyncErrorBoundaryProps) {
    super(props);
    this.state = { error: null, hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { error, hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Async operation error:', error, errorInfo);
    this.props.onError?.(error);
  }

  retry = () => {
    this.setState({ error: null, hasError: false });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.retry} />;
      }

      return (
        <ErrorDisplay
          title="Operation Failed"
          message={this.state.error.message}
          onRetry={this.retry}
        />
      );
    }

    return this.props.children;
  }
}

// Hook for handling async errors
export function useAsyncError() {
  const [asyncError, setAsyncError] = React.useState<Error | null>(null);

  const handleAsyncError = React.useCallback((error: Error) => {
    setAsyncError(error);
  }, []);

  const clearAsyncError = React.useCallback(() => {
    setAsyncError(null);
  }, []);

  // Throw error to be caught by error boundary
  if (asyncError) {
    throw asyncError;
  }

  return { handleAsyncError, clearAsyncError };
}