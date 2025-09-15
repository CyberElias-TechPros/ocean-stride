import React, { useState, useEffect, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from './components/ui/toaster';
import { Toaster as Sonner } from './components/ui/sonner';
import { ErrorBoundary } from './components/error-boundary';
import { DatabaseProvider } from './contexts/DatabaseContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { I18nProvider } from './i18n/I18nProvider';
// Logger functionality removed for simplicity
import { LoadingSpinner } from './components/ui/loading-spinner';
import { ThemeProvider } from './components/theme-provider';

// Lazy load pages for better performance
const LoginPage = React.lazy(() => import('./pages/Login'));
const IndexPage = React.lazy(() => import('./pages/Index'));
const PersonnelPage = React.lazy(() => import('./pages/Personnel'));
const FleetPage = React.lazy(() => import('./pages/Fleet'));
const RecruitmentPage = React.lazy(() => import('./pages/Recruitment'));
const PayrollPage = React.lazy(() => import('./pages/Payroll'));
const CompliancePage = React.lazy(() => import('./pages/Compliance'));
const AnalyticsPage = React.lazy(() => import('./pages/Analytics'));
const SettingsPage = React.lazy(() => import('./pages/Settings'));
const NotFoundPage = React.lazy(() => import('./pages/NotFound'));

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner className="h-12 w-12" />
  </div>
);

// Protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useNavigate();
  const currentLocation = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the current location to redirect back after login
      sessionStorage.setItem('redirectPath', currentLocation.pathname);
      location('/login');
    }
  }, [isAuthenticated, isLoading, location, currentLocation]);

  if (isLoading) {
    return <LoadingFallback />;
  }

  return isAuthenticated ? <>{children}</> : null;
};

// Main app routes
const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // Log page views - simplified
  useEffect(() => {
    console.log(`Navigated to: ${location.pathname}`);
  }, [location]);

  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <LoginPage />
          </Suspense>
        }
      />

      {/* Protected routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <IndexPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/personnel"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <PersonnelPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/fleet"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <FleetPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/recruitment"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <RecruitmentPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/payroll"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <PayrollPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/compliance"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <CompliancePage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <AnalyticsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingFallback />}>
              <SettingsPage />
            </Suspense>
          </ProtectedRoute>
        }
      />

      {/* 404 - Not Found */}
      <Route
        path="*"
        element={
          <Suspense fallback={<LoadingFallback />}>
            <NotFoundPage />
          </Suspense>
        }
      />
    </Routes>
  );
};

const App = () => {
  // Initialize app
  useEffect(() => {
    console.log('Ocean Stride application initialized');
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <DatabaseProvider>
            <ThemeProvider defaultTheme="system" storageKey="ocean-stride-theme">
              <TooltipProvider delayDuration={300}>
                <BrowserRouter>
                  <AuthProvider>
                    <CompanyProvider>
                      <AppRoutes />
                    </CompanyProvider>
                  </AuthProvider>
                </BrowserRouter>
                <Toaster />
                <Sonner position="top-right" />
              </TooltipProvider>
            </ThemeProvider>
          </DatabaseProvider>
        </I18nProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
