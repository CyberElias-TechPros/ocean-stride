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
import { CompanyProvider } from './context/CompanyContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { I18nProvider } from './i18n/I18nProvider';

// Lazy load pages
const LoginPage = lazy(() => import('@/pages/Login'));
const DashboardPage = lazy(() => import('@/pages/Index'));

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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
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
          <DashboardPage />
        </ProtectedRoute>
      ),
      children: [
        {
          index: true,
          element: <Navigate to={ROUTES.DASHBOARD} replace />,
        },
        ...appRoutes
          .filter(route => route.path !== ROUTES.LOGIN && route.path !== ROUTES.NOT_FOUND)
          .map(route => ({
            path: route.path === ROUTES.DASHBOARD ? 'dashboard' : route.path?.substring(1),
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
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
          <DatabaseProvider>
            <ThemeProvider defaultTheme="system" storageKey="ocean-stride-theme">
              <TooltipProvider delayDuration={300}>
                <QueryErrorResetBoundary>
                  {() => (
                    <BrowserRouter>
                      <AuthProvider>
                        <CompanyProvider>
                          <RouteLoadingBoundary>
                            <AppRoutes />
                          </RouteLoadingBoundary>
                        </CompanyProvider>
                      </AuthProvider>
                      <Toaster />
                      <Sonner position="top-right" />
                    </BrowserRouter>
                  )}
                </QueryErrorResetBoundary>
              </TooltipProvider>
            </ThemeProvider>
          </DatabaseProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
