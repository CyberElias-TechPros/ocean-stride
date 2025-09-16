import React, { Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingSpinner } from '../ui/loading-spinner';
import { Button } from '../ui/button';

interface RouteLoadingBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
}

const DefaultErrorFallback = ({ 
  error, 
  resetErrorBoundary 
}: { 
  error: Error; 
  resetErrorBoundary: () => void 
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        {error.message || 'An unexpected error occurred'}
      </p>
      <Button 
        onClick={resetErrorBoundary}
        variant="outline"
        className="px-6 py-2"
      >
        Try again
      </Button>
    </div>
  );
};

export const RouteLoadingBoundary: React.FC<RouteLoadingBoundaryProps> = ({
  children,
  fallback,
  errorFallback: ErrorFallback = DefaultErrorFallback,
}) => {
  const defaultFallback = (
    <div className="flex items-center justify-center min-h-screen">
      <LoadingSpinner className="h-12 w-12" />
    </div>
  );

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset the state of your app so the error doesn't happen again
        window.location.href = '/';
      }}
    >
      <Suspense fallback={fallback || defaultFallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Higher-order component for wrapping routes with loading and error boundaries
export const withRouteBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  options: Omit<RouteLoadingBoundaryProps, 'children'> = {}
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <RouteLoadingBoundary {...options}>
      <Component {...props} />
    </RouteLoadingBoundary>
  );
  
  // Set a display name for the wrapped component for better debugging
  const componentName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withRouteBoundary(${componentName})`;
  
  return WrappedComponent;
};
