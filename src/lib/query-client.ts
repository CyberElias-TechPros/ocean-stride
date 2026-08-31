import { QueryClient } from '@tanstack/react-query';
import { handleError } from './error-handler';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors, except for 401 (unauthorized)
        if (error?.response?.status >= 400 && error?.response?.status < 500 && error?.response?.status !== 401) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

// Kept for services that still import it to surface handled errors.
export { handleError };

// Query keys
export const QUERY_KEYS = {
  AUTH: {
    CURRENT_USER: ['currentUser'],
  },
  USERS: {
    ALL: ['users'],
    LISTS: (filters: Record<string, any> = {}) => ['users', 'list', ...Object.entries(filters)],
    DETAILS: (id: string) => ['users', id],
  },
  COMPANIES: {
    ALL: ['companies'],
    LISTS: (filters: any) => ['companies', 'list', filters],
    DETAILS: (id: string) => ['companies', 'detail', id],
    STATS: (id: string) => ['companies', 'stats', id],
  },
  VESSELS: {
    ALL: ['vessels'],
    LISTS: (filters: Record<string, any> = {}) => ['vessels', 'list', ...Object.entries(filters)],
    DETAILS: (id: string) => ['vessels', id],
    CREW: (vesselId: string) => ['vessels', vesselId, 'crew'],
  },
  SEAFARERS: {
    ALL: ['seafarers'],
    LISTS: (filters: any) => ['seafarers', 'list', filters],
    DETAILS: (id: string) => ['seafarers', 'detail', id],
  },
  CREW: {
    ALL: ['crew'],
    LISTS: (filters: Record<string, any> = {}) => ['crew', 'list', ...Object.entries(filters)],
    DETAILS: (id: string) => ['crew', id],
    CERTIFICATIONS: (crewId: string) => ['crew', crewId, 'certifications'],
  },
  ASSIGNMENTS: {
    ALL: ['assignments'],
    LISTS: (filters: any) => ['assignments', 'list', filters],
    DETAILS: (id: string) => ['assignments', 'detail', id],
  },
  PAYROLLS: {
    ALL: ['payrolls'],
    LISTS: (filters: any) => ['payrolls', 'list', filters],
    DETAILS: (id: string) => ['payrolls', 'detail', id],
  },
  CERTIFICATES: {
    ALL: ['certificates'],
    LISTS: (filters: any) => ['certificates', 'list', filters],
    DETAILS: (id: string) => ['certificates', 'detail', id],
    EXPIRING: (days: number) => ['certificates', 'expiring', days],
    EXPIRED: ['certificates', 'expired'],
  },
  RANKS: {
    ALL: ['ranks'],
    LISTS: (filters: any) => ['ranks', 'list', filters],
    DETAILS: (id: string) => ['ranks', 'detail', id],
  },
  DOCUMENTS: {
    BY_TYPE: (type: string, id: string) => ['documents', type, id],
  },
};
