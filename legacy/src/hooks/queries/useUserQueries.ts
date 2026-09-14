import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { userService } from '@/services';
import { QUERY_KEYS } from '@/lib/query-client';
import { 
  User, 
  UserCreateDto as CreateUserDto, 
  UserUpdateDto as UpdateUserDto, 
  UserRole,
  PaginatedResponse
} from '@/types';

type UserListFilters = {
  search?: string;
  role?: UserRole;
  status?: string;
  page?: number;
  limit?: number;
};

export const useUsers = (
  filters: UserListFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<User>, Error>, 'queryKey' | 'queryFn'>
) => {
  const { page = 1, limit = 10, ...rest } = filters;
  
  return useQuery<PaginatedResponse<User>, Error>({
    queryKey: QUERY_KEYS.USERS.LISTS(filters),
    queryFn: () => userService.getUsers(page, limit, rest.search, rest),
    ...options,
  });
};

export const useUser = (id: string, options?: Omit<UseQueryOptions<User, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<User, Error>({
    queryKey: QUERY_KEYS.USERS.DETAILS(id),
    queryFn: () => userService.getUserById(id),
    ...options,
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.ALL });
    },
  });
};

export const useUpdateUser = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof userService.updateUser>[1]) => 
      userService.updateUser(id, data),
    onSuccess: (data) => {
      // Update the user in the cache
      queryClient.setQueryData(QUERY_KEYS.USERS.DETAILS(id), data);
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.ALL });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => userService.deleteUser(id),
    onSuccess: (_, id) => {
      // Remove the user from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.USERS.DETAILS(id) });
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.ALL });
    },
  });
};

export const useUpdateUserRole = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (role: UserRole) => userService.updateUserRole(id, role),
    onSuccess: (data) => {
      // Update the user in the cache
      queryClient.setQueryData(QUERY_KEYS.USERS.DETAILS(id), data);
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.ALL });
    },
  });
};

export const useUploadUserAvatar = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (file: File) => userService.uploadProfileImage(userId, file),
    onSuccess: (data) => {
      // Update the user in the cache with the new avatar URL
      queryClient.setQueryData<User | undefined>(
        QUERY_KEYS.USERS.DETAILS(userId),
        (old) => old ? { ...old, avatarUrl: data.url } : undefined
      );
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.USERS.ALL });
    },
  });
};
