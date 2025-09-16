import React, { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '../ui/loading-spinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the current location they were trying to go to
      sessionStorage.setItem('redirectPath', location.pathname);
      navigate('/login');
    } else if (!isLoading && isAuthenticated && requireAdmin && !user?.isAdmin) {
      // Redirect to dashboard if user is not an admin but admin access is required
      navigate('/');
    }
  }, [isAuthenticated, isLoading, navigate, location, requireAdmin, user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="h-12 w-12" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will be redirected by the useEffect
  }

  if (requireAdmin && !user?.isAdmin) {
    return null; // Will be redirected by the useEffect
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
