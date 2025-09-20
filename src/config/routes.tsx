import React from 'react';
import { RouteObject } from 'react-router-dom';
import { ProtectedRoute } from '@/components/routing/ProtectedRoute';

// Lazy load all page components
const LoginPage = React.lazy(() => import('@/pages/auth/LoginPage'));
const ForgotPasswordPage = React.lazy(() => import('@/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/pages/auth/ResetPasswordPage'));
const DashboardPage = React.lazy(() => import('@/pages/Dashboard'));
const PersonnelPage = React.lazy(() => import('@/pages/Personnel'));
const FleetPage = React.lazy(() => import('@/pages/Fleet'));
const RecruitmentPage = React.lazy(() => import('@/pages/Recruitment'));
const PayrollPage = React.lazy(() => import('@/pages/Payroll'));
const CompliancePage = React.lazy(() => import('@/pages/Compliance'));
const AnalyticsPage = React.lazy(() => import('@/pages/Analytics'));
const SettingsPage = React.lazy(() => import('@/pages/Settings'));
const NotFoundPage = React.lazy(() => import('@/pages/NotFound'));
const UserListPage = React.lazy(() => import('@/pages/users/UserListPage'));
const UserDetailPage = React.lazy(() => import('@/pages/users/UserDetailPage'));
const UserEditPage = React.lazy(() => import('@/pages/users/UserEditPage'));
const UserCreatePage = React.lazy(() => import('@/pages/users/UserCreatePage'));

// Route paths
export const ROUTES = {
  // Auth routes
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  
  // App routes
  DASHBOARD: '/',
  PERSONNEL: '/personnel',
  USERS: {
    LIST: '/users',
    CREATE: '/users/new',
    DETAILS: (id: string) => `/users/${id}`,
    EDIT: (id: string) => `/users/${id}/edit`,
  },
  FLEET: '/fleet',
  RECRUITMENT: '/recruitment',
  PAYROLL: '/payroll',
  COMPLIANCE: '/compliance',
  ANALYTICS: '/analytics',
  SETTINGS: '/settings',
  
  // System routes
  NOT_FOUND: '*',
} as const;

// Type for route paths
export type RoutePath = typeof ROUTES[keyof typeof ROUTES];

// Navigation items for the sidebar
export const NAV_ITEMS = [
  {
    title: 'Dashboard',
    href: ROUTES.DASHBOARD,
    icon: 'dashboard',
  },
  {
    title: 'Users',
    href: ROUTES.USERS.LIST,
    icon: 'users',
    adminOnly: true,
  },
  {
    title: 'Personnel',
    href: ROUTES.PERSONNEL,
    icon: 'users',
  },
  {
    title: 'Fleet',
    href: ROUTES.FLEET,
    icon: 'ship',
  },
  {
    title: 'Recruitment',
    href: ROUTES.RECRUITMENT,
    icon: 'briefcase',
  },
  {
    title: 'Payroll',
    href: ROUTES.PAYROLL,
    icon: 'credit-card',
  },
  {
    title: 'Compliance',
    href: ROUTES.COMPLIANCE,
    icon: 'shield',
  },
  {
    title: 'Analytics',
    href: ROUTES.ANALYTICS,
    icon: 'bar-chart',
  },
  {
    title: 'Settings',
    href: ROUTES.SETTINGS,
    icon: 'settings',
  },
];

// Route configuration
export const routes: RouteObject[] = [
  // Public routes
  {
    path: ROUTES.LOGIN,
    element: (
      <React.Suspense fallback={null}>
        <LoginPage />
      </React.Suspense>
    ),
  },
  {
    path: ROUTES.FORGOT_PASSWORD,
    element: <ForgotPasswordPage />,
  },
  {
    path: ROUTES.RESET_PASSWORD,
    element: <ResetPasswordPage />,
  },
  
  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTES.DASHBOARD,
        element: <DashboardPage />,
      },
      {
        path: ROUTES.PERSONNEL,
        element: <PersonnelPage />,
      },
      // User management routes
      {
        path: ROUTES.USERS.LIST,
        element: <UserListPage />,
      },
      {
        path: ROUTES.USERS.CREATE,
        element: <UserCreatePage />,
      },
      {
        path: ROUTES.USERS.DETAILS(':id'),
        element: <UserDetailPage />,
      },
      {
        path: ROUTES.USERS.EDIT(':id'),
        element: <UserEditPage />,
      },
      {
        path: ROUTES.FLEET,
        element: <FleetPage />,
      },
      {
        path: ROUTES.RECRUITMENT,
        element: <RecruitmentPage />,
      },
      {
        path: ROUTES.PAYROLL,
        element: (
          <React.Suspense fallback={null}>
            <PayrollPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.COMPLIANCE,
        element: (
          <React.Suspense fallback={null}>
            <CompliancePage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.ANALYTICS,
        element: (
          <React.Suspense fallback={null}>
            <AnalyticsPage />
          </React.Suspense>
        ),
      },
      {
        path: ROUTES.SETTINGS,
        element: (
          <React.Suspense fallback={null}>
            <SettingsPage />
          </React.Suspense>
        ),
      },
    ],
  },
  
  // 404 route - must be last
  {
    path: ROUTES.NOT_FOUND,
    element: (
      <React.Suspense fallback={null}>
        <NotFoundPage />
      </React.Suspense>
    ),
  },
];
