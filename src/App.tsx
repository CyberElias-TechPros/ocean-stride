import React, { Suspense, lazy } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { QueryErrorResetBoundary } from '@tanstack/react-query';
import { BrowserRouter, useRoutes, Navigate } from 'react-router-dom';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { routes as appRoutes, ROUTES } from '@/config/routes';
import ErrorBoundary from '@/contexts/ErrorBoundary';
import { errorBoundaryHandler } from '@/lib/error-handler';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { CompanyProvider } from '@/context/CompanyContext';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { I18nProvider } from './i18n/I18nProvider';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/Login'));
// Layout wrapper hosting authenticated routes (renders <Outlet />)
const LayoutPage = lazy(() => import('@/pages/Index'));

// Create query client with default error handling
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Loading boundary component
const RouteLoadingBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ErrorBoundary onError={errorBoundaryHandler}>
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/cea.png"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://techpros.com.ng/wp-content/uploads/2025/08/CEA.png'; }}
            alt="Seafarer Management System"
            className="w-64 h-64 rounded-md shadow"
          />
          <h1 className="text-xl font-bold">Seafarer Management System</h1>
        </div>
      </div>
    }>
      {children}
    </Suspense>
  </ErrorBoundary>
);

/**
 * Main application routes with proper nested routing and authentication flow
 */
const AppRoutes = () => {
  const { isLoading } = useAuth();
  // Flatten protected child routes from config so we don't double-wrap ProtectedRoute
  const protectedContainer = appRoutes.find((r: any) => Array.isArray((r as any).children));
  const protectedChildren = (protectedContainer as any)?.children ?? [];

  const element = useRoutes([
    // Public routes
    {
      path: ROUTES.LOGIN,
      element: (
        <RouteLoadingBoundary>
          <LoginPage />
        </RouteLoadingBoundary>
      ),
    },
    
    // Protected routes
    {
      element: (
        <ProtectedRoute>
          <LayoutPage />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: (
            <RouteLoadingBoundary>
              {protectedChildren.find((r: any) => r.path === ROUTES.DASHBOARD)?.element}
            </RouteLoadingBoundary>
          ),
        },
        ...protectedChildren
          .filter((route: any) => route.path && route.path !== ROUTES.DASHBOARD)
          .map((route: any) => ({
            path: route.path?.substring(1),
            element: (
              <RouteLoadingBoundary>
                {route.element}
              </RouteLoadingBoundary>
            ),
          })),
      ],
    },
    // 404 - Not Found route
    {
      path: '*',
      element: <Navigate to="/" replace />,
    },
  ]);

  // Show loading state while checking auth status
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img
            src="/cea.png"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://techpros.com.ng/wp-content/uploads/2025/08/CEA.png'; }}
            alt="Seafarer Management System"
            className="w-64 h-64 rounded-md shadow"
          />
          <h1 className="text-xl font-bold">Seafarer Management System</h1>
        </div>
      </div>
    );
  }

  return element;
};

// Main App component with all providers
const App = () => {
  return (
    <ErrorBoundary onError={errorBoundaryHandler}>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <AuthProvider>
            <DatabaseProvider>
              <ThemeProvider defaultTheme="system" storageKey="ocean-stride-theme">
                <TooltipProvider delayDuration={300}>
                  <QueryErrorResetBoundary>
                    {() => (
                      <BrowserRouter>
                        <CompanyProvider>
                          <RouteLoadingBoundary>
                            <AppRoutes />
                          </RouteLoadingBoundary>
                        </CompanyProvider>
                        <Toaster />
                        <Sonner position="top-right" />
                      </BrowserRouter>
                    )}
                  </QueryErrorResetBoundary>
                </TooltipProvider>
              </ThemeProvider>
            </DatabaseProvider>
          </AuthProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
