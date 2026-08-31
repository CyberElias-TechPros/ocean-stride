import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '../ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

function isAdminUser(role?: string): boolean {
  return role === 'admin' || role === 'superadmin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requireAdmin && !isAdminUser(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export const withProtectedRoute = <P extends object>(
  Component: React.ComponentType<P>,
  requireAdmin: boolean = false
) => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ProtectedRoute requireAdmin={requireAdmin}>
      <Component {...props} />
    </ProtectedRoute>
  );
  
  // Set a display name for the wrapped component for better debugging
  const componentName = Component.displayName || Component.name || 'Component';
  WrappedComponent.displayName = `withProtectedRoute(${componentName})`;
  
  return WrappedComponent;
};
