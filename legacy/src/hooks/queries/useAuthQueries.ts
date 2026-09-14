import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authService } from '@/services';
import { QUERY_KEYS } from '@/lib/query-client';

export const useCurrentUser = () => {
  return useQuery({
    queryKey: QUERY_KEYS.AUTH.CURRENT_USER,
    queryFn: () => authService.getCurrentUser(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on 401 (unauthorized)
      if (error?.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

export const useLogin = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      // Invalidate and refetch the current user query
      queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER, data.user);
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (data) => {
      // Invalidate and refetch the current user query
      queryClient.setQueryData(QUERY_KEYS.AUTH.CURRENT_USER, data.user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      // Remove all queries from the cache
      queryClient.clear();
      // Clear the auth token
      authService.clearAuth();
    },
  });
};

export const useRefreshToken = () => {
  return useMutation({
    mutationFn: authService.refreshToken,
  });
};

export const useIsAuthenticated = () => {
  const { data: user, isLoading, isError } = useCurrentUser();
  return {
    isAuthenticated: !!user && !isError,
    isLoading,
    user,
  };
};
