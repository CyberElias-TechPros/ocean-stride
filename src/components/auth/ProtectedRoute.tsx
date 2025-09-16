import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAuthStore } from '@/store';
import { Spinner } from '@/components/ui/spinner';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  children?: ReactNode;
  element?: ReactNode;
}

/**
 * A component that protects routes from unauthorized access.
 * If the user is not authenticated, they will be redirected to the login page.
 * If the user doesn't have the required role, they will be redirected to the dashboard.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles = [],
  children,
  element,
}) => {
  const { isAuthenticated, isLoading, user } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page, but save the current location they were trying to go to
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  // Check if user has required role
  if (allowedRoles.length > 0 && (!user || !allowedRoles.includes(user.role))) {
    // User is authenticated but doesn't have required role
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  // If all checks pass, render the child routes or the element if provided
  if (element) {
    return <>{element}</>;
  }

  return children ? <>{children}</> : <Outlet />;
};

// This is a type guard to help TypeScript understand the route object
// with our custom properties
declare module 'react-router' {
  interface IndexRouteObject {
    protected?: boolean;
    allowedRoles?: string[];
  }
  interface NonIndexRouteObject {
    protected?: boolean;
    allowedRoles?: string[];
  }
}
