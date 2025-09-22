import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES } from '@/lib/schemas_v2';
import { CrewAssignment, AssignmentCreateDto, AssignmentUpdateDto } from '@/types/assignment.types';

const db = DatabaseServiceV2.getInstance();

type AssignmentListFilters = {
  search?: string;
  seafarerId?: string;
  vesselId?: string;
  status?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

export const useAssignments = (
  filters: AssignmentListFilters = {},
  options?: Omit<UseQueryOptions<CrewAssignment[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<CrewAssignment[], Error>({
    queryKey: ['assignments', filters],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS);
      
      // Apply filters
      if (filters.seafarerId) {
        results = await db.getByIndex<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, 'by_seafarer', filters.seafarerId);
      }
      if (filters.vesselId && results.length > 0) {
        results = results.filter(a => a.vesselId === filters.vesselId);
      }
      if (filters.status && results.length > 0) {
        results = results.filter(a => a.status === filters.status);
      }
      if (filters.companyId && results.length > 0) {
        results = results.filter(a => a.companyId === filters.companyId);
      }
      
      return results;
    },
    ...options,
  });
};

export const useAssignment = (id: string, options?: Omit<UseQueryOptions<CrewAssignment | null, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<CrewAssignment | null, Error>({
    queryKey: ['assignment', id],
    queryFn: async () => {
      await db.init();
      return db.get<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, id);
    },
    ...options,
  });
};

export const useCreateAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AssignmentCreateDto) => {
      await db.init();
      return db.create<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
    },
  });
};

export const useUpdateAssignment = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: AssignmentUpdateDto) => {
      await db.init();
      return db.update<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, id, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['assignment', id], data);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
    },
  });
};

export const useDeleteAssignment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db.init();
      return db.delete(STORE_NAMES.CREW_ASSIGNMENTS, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['assignment', id] });
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
      queryClient.invalidateQueries({ queryKey: ['vessels'] });
    },
  });
};

export const useSignOnAssignment = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ signOnDate }: { signOnDate: string }) => {
      await db.init();
      return db.update<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, id, {
        status: 'active',
        signOnDate,
        isActive: true,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['assignment', id], data);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
    },
  });
};

export const useSignOffAssignment = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ signOffDate }: { signOffDate: string }) => {
      await db.init();
      return db.update<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, id, {
        status: 'completed',
        signOffDate,
        isActive: false,
        endDate: signOffDate,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['assignment', id], data);
      queryClient.invalidateQueries({ queryKey: ['assignments'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
    },
  });
};