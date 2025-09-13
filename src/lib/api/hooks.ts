import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { api, queryKeys, ApiResponse } from './index';
import { useErrorBoundary } from '@/components/error-boundary';

export function useEntity<T>(entity: string, id: string, options?: UseQueryOptions<ApiResponse<T>>) {
  return useQuery({
    queryKey: queryKeys.entity(entity, id),
    queryFn: () => api.find<T>(entity, id),
    ...options,
  });
}

export function useEntityList<T>(
  entity: string, 
  filters?: Record<string, any>, 
  options?: UseQueryOptions<ApiResponse<T[]>>
) {
  return useQuery({
    queryKey: queryKeys.entityList(entity, filters),
    queryFn: () => api.findAll<T>(entity, filters),
    ...options,
  });
}

export function useCreateEntity<T>(entity: string) {
  const queryClient = useQueryClient();
  const { showBoundary } = useErrorBoundary();
  
  return useMutation({
    mutationFn: (data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>) => 
      api.create<T>(entity, data),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [entity] });
    },
    onError: (error) => {
      showBoundary(error);
    },
  });
}

export function useUpdateEntity<T>(entity: string, id: string) {
  const queryClient = useQueryClient();
  const { showBoundary } = useErrorBoundary();
  
  return useMutation({
    mutationFn: (updates: Partial<T>) => 
      api.update<T>(entity, id, updates),
    onSuccess: (data) => {
      // Update the cache with the new data
      queryClient.setQueryData(queryKeys.entity(entity, id), data);
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [entity] });
    },
    onError: (error) => {
      showBoundary(error);
    },
  });
}

export function useDeleteEntity(entity: string) {
  const queryClient = useQueryClient();
  const { showBoundary } = useErrorBoundary();
  
  return useMutation({
    mutationFn: (id: string) => api.delete(entity, id),
    onSuccess: (_, id) => {
      // Remove the item from the cache
      queryClient.removeQueries({ queryKey: queryKeys.entity(entity, id) });
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: [entity] });
    },
    onError: (error) => {
      showBoundary(error);
    },
  });
}

// Seafarer specific hooks
export function useSeafarer(id: string, options?: UseQueryOptions<ApiResponse<any>>) {
  return useQuery({
    queryKey: queryKeys.seafarers.detail(id),
    queryFn: () => api.find<any>('seafarers', id),
    ...options,
  });
}

export function useSeafarers(filters?: any, options?: UseQueryOptions<ApiResponse<any[]>>) {
  return useQuery({
    queryKey: queryKeys.seafarers.list(filters),
    queryFn: () => api.findAll<any>('seafarers', filters),
    ...options,
  });
}

export function useSearchSeafarers(query: string, companyId?: string) {
  return useQuery({
    queryKey: queryKeys.seafarers.search(query, companyId),
    queryFn: () => api.seafarers.searchByName(query, companyId),
    enabled: query.length > 1, // Only run when query has at least 2 characters
  });
}

// Vessel specific hooks
export function useVessel(id: string, options?: UseQueryOptions<ApiResponse<any>>) {
  return useQuery({
    queryKey: queryKeys.vessels.detail(id),
    queryFn: () => api.find<any>('vessels', id),
    ...options,
  });
}

export function useVessels(filters?: any, options?: UseQueryOptions<ApiResponse<any[]>>) {
  return useQuery({
    queryKey: queryKeys.vessels.list(filters),
    queryFn: () => api.findAll<any>('vessels', filters),
    ...options,
  });
}

// Crew Assignment hooks
export function useCrewAssignmentsByVessel(vesselId: string) {
  return useQuery({
    queryKey: queryKeys.crewAssignments.byVessel(vesselId),
    queryFn: () => api.crewAssignments.getByVessel(vesselId),
  });
}

export function useCrewAssignmentsBySeafarer(seafarerId: string) {
  return useQuery({
    queryKey: queryKeys.crewAssignments.bySeafarer(seafarerId),
    queryFn: () => api.crewAssignments.getBySeafarer(seafarerId),
  });
}

// Payroll hooks
export function usePayrollByPeriod(startDate: string, endDate: string, companyId?: string) {
  return useQuery({
    queryKey: queryKeys.payroll.byPeriod(startDate, endDate, companyId),
    queryFn: () => api.payroll.getByPeriod(startDate, endDate, companyId),
  });
}

// Custom hook for pagination
export function usePagination<T>(
  queryKey: any[],
  fetchFn: (params: any) => Promise<ApiResponse<T[]>>,
  initialParams: any = { page: 1, pageSize: 10 },
  options: any = {}
) {
  const [params, setParams] = useState(initialParams);
  
  const query = useQuery({
    queryKey: [...queryKey, params],
    queryFn: () => fetchFn(params),
    keepPreviousData: true,
    ...options,
  });

  const updateParams = (updates: any) => {
    setParams((prev: any) => ({
      ...prev,
      ...updates,
    }));
  };

  const onPageChange = (page: number) => {
    updateParams({ page });
  };

  const onPageSizeChange = (pageSize: number) => {
    updateParams({ pageSize, page: 1 });
  };

  const onSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    updateParams({ 
      sortBy, 
      sortOrder,
      page: 1, // Reset to first page when sorting
    });
  };

  const onFilter = (filters: any) => {
    updateParams({
      ...filters,
      page: 1, // Reset to first page when filtering
    });
  };

  return {
    ...query,
    params,
    pagination: {
      page: params.page,
      pageSize: params.pageSize,
      total: query.data?.data?.length || 0,
      onPageChange,
      onPageSizeChange,
    },
    sorting: {
      sortBy: params.sortBy,
      sortOrder: params.sortOrder,
      onSort,
    },
    onFilter,
  };
}

// Hook for infinite loading
export function useInfiniteQuery<T>(
  queryKey: any[],
  fetchFn: (params: any) => Promise<ApiResponse<T[]>>,
  initialParams: any = {},
  options: any = {}
) {
  return useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam = 0 }) => 
      fetchFn({ ...initialParams, page: pageParam }),
    getNextPageParam: (lastPage, allPages) => {
      // Implement your own logic to determine if there are more pages
      const nextPage = allPages.length;
      return nextPage < 10 ? nextPage + 1 : undefined; // Example: limit to 10 pages
    },
    ...options,
  });
}
