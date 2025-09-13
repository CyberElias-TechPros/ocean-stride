import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ErrorBoundary } from '@/components/error-boundary';
import { AppLayout } from '@/components/layout/AppLayout';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

// Lazy load route components
const DashboardPage = lazy(() => import('@/pages/Dashboard'));
const PersonnelPage = lazy(() => import('@/pages/Personnel'));
const FleetPage = lazy(() => import('@/pages/Fleet'));
const RecruitmentPage = lazy(() => import('@/pages/Recruitment'));
const PayrollPage = lazy(() => import('@/pages/Payroll'));
const CompliancePage = lazy(() => import('@/pages/Compliance'));
const AnalyticsPage = lazy(() => import('@/pages/Analytics'));
const SettingsPage = lazy(() => import('@/pages/Settings'));
const LoginPage = lazy(() => import('@/pages/Login'));
const NotFoundPage = lazy(() => import('@/pages/NotFound'));

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner className="h-12 w-12" />
  </div>
);

// Protected route component
interface ProtectedRouteProps {
  isAuthenticated: boolean;
  children?: React.ReactNode;
  requiredRole?: string[];
  userRole?: string;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  isAuthenticated,
  children,
  requiredRole = [],
  userRole,
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole.length > 0 && (!userRole || !requiredRole.includes(userRole))) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children || <Outlet />}</>;
};

// Create the router with all routes
export const createRouter = (isAuthenticated: boolean, userRole?: string) => {
  return createBrowserRouter([
    {
      path: '/login',
      element: !isAuthenticated ? (
        <Suspense fallback={<LoadingFallback />}>
          <LoginPage />
        </Suspense>
      ) : (
        <Navigate to="/" replace />
      ),
      errorElement: <ErrorBoundary />,
    },
    {
      path: '/',
      element: (
        <ProtectedRoute isAuthenticated={isAuthenticated} userRole={userRole}>
          <AppLayout />
        </ProtectedRoute>
      ),
      errorElement: <ErrorBoundary />,
      children: [
        {
          index: true,
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <DashboardPage />
            </Suspense>
          ),
        },
        {
          path: 'personnel',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PersonnelPage />
            </Suspense>
          ),
        },
        {
          path: 'fleet',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <FleetPage />
            </Suspense>
          ),
        },
        {
          path: 'recruitment',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <RecruitmentPage />
            </Suspense>
          ),
          // Example of role-based access
          // element: (
          //   <ProtectedRoute isAuthenticated={isAuthenticated} requiredRole={['admin', 'hr']} userRole={userRole}>
          //     <Suspense fallback={<LoadingFallback />}>
          //       <RecruitmentPage />
          //     </Suspense>
          //   </ProtectedRoute>
          // ),
        },
        {
          path: 'payroll',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <PayrollPage />
            </Suspense>
          ),
        },
        {
          path: 'compliance',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <CompliancePage />
            </Suspense>
          ),
        },
        {
          path: 'analytics',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <AnalyticsPage />
            </Suspense>
          ),
        },
        {
          path: 'settings',
          element: (
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage />
            </Suspense>
          ),
        },
      ],
    },
    {
      path: '/unauthorized',
      element: <div>Unauthorized access</div>,
    },
    {
      path: '*',
      element: (
        <Suspense fallback={<LoadingFallback />}>
          <NotFoundPage />
        </Suspense>
      ),
    },
  ]);
};

// Export types
export type { ProtectedRouteProps };
export { LoadingFallback };

export default createRouter;
