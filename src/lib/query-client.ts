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
      onError: (error) => {
        handleError(error);
      },
    },
    mutations: {
      onError: (error) => {
        handleError(error);
      },
      retry: false,
    },
  },
});

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
  VESSELS: {
    ALL: ['vessels'],
    LISTS: (filters: Record<string, any> = {}) => ['vessels', 'list', ...Object.entries(filters)],
    DETAILS: (id: string) => ['vessels', id],
    CREW: (vesselId: string) => ['vessels', vesselId, 'crew'],
  },
  CREW: {
    ALL: ['crew'],
    LISTS: (filters: Record<string, any> = {}) => ['crew', 'list', ...Object.entries(filters)],
    DETAILS: (id: string) => ['crew', id],
    CERTIFICATIONS: (crewId: string) => ['crew', crewId, 'certifications'],
  },
  DOCUMENTS: {
    BY_TYPE: (type: string, id: string) => ['documents', type, id],
  },
};
