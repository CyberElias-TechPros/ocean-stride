import { keepPreviousData, useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { crewService } from '@/services';
import { QUERY_KEYS } from '@/lib/query-client';
import { 
  CrewMember, 
  CreateCrewMemberDto, 
  UpdateCrewMemberDto,
  CrewStatus,
  Certification,
  PaginatedResponse
} from '@/types';

type CrewListFilters = {
  search?: string;
  status?: CrewStatus;
  page?: number;
  limit?: number;
};

export const useCrewMembers = (
  filters: CrewListFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<CrewMember>, Error>, 'queryKey' | 'queryFn'>
) => {
  const { page = 1, limit = 10, ...rest } = filters;
  
  return useQuery<PaginatedResponse<CrewMember>, Error>({
    queryKey: QUERY_KEYS.CREW.LISTS(filters),
    queryFn: () => crewService.getCrewMembers(page, limit, rest.search, rest.status),
    ...options,
  });
};

export const useCrewMember = (id: string, options?: Omit<UseQueryOptions<CrewMember, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<CrewMember, Error>({
    queryKey: QUERY_KEYS.CREW.DETAILS(id),
    queryFn: () => crewService.getCrewMemberById(id),
    ...options,
  });
};

export const useCreateCrewMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: crewService.createCrewMember,
    onSuccess: () => {
      // Invalidate the crew members list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREW.ALL });
    },
  });
};

export const useUpdateCrewMember = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof crewService.updateCrewMember>[1]) => 
      crewService.updateCrewMember(id, data),
    onSuccess: (data) => {
      // Update the crew member in the cache
      queryClient.setQueryData(QUERY_KEYS.CREW.DETAILS(id), data);
      // Invalidate the crew members list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREW.ALL });
    },
  });
};

export const useDeleteCrewMember = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => crewService.deleteCrewMember(id),
    onSuccess: (_, id) => {
      // Remove the crew member from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.CREW.DETAILS(id) });
      // Invalidate the crew members list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREW.ALL });
    },
  });
};

export const useCrewCertifications = (crewMemberId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CREW.CERTIFICATIONS(crewMemberId), { page, limit }],
    queryFn: () => crewService.getCertifications(crewMemberId, page, limit),
    placeholderData: keepPreviousData,
    enabled: !!crewMemberId,
  });
};

export const useAddCertification = (crewMemberId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof crewService.addCertification>[1]) => 
      crewService.addCertification(crewMemberId, data),
    onSuccess: () => {
      // Invalidate the certifications list to refetch
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.CREW.CERTIFICATIONS(crewMemberId) 
      });
    },
  });
};

export const useUpdateCertification = (crewMemberId: string, certificationId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Partial<Certification>) => 
      crewService.updateCertification(crewMemberId, certificationId, data),
    onSuccess: () => {
      // Invalidate the certifications list to refetch
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.CREW.CERTIFICATIONS(crewMemberId) 
      });
    },
  });
};

export const useDeleteCertification = (crewMemberId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (certificationId: string) => 
      crewService.deleteCertification(crewMemberId, certificationId),
    onSuccess: () => {
      // Invalidate the certifications list to refetch
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.CREW.CERTIFICATIONS(crewMemberId) 
      });
    },
  });
};

export const useUploadCrewDocument = (crewMemberId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { 
      file: File; 
      documentType: string; 
      metadata?: Record<string, any> 
    }) => crewService.uploadDocument(
      crewMemberId, 
      data.file, 
      data.documentType, 
      data.metadata
    ),
    onSuccess: () => {
      // Invalidate the crew member to refetch
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.CREW.DETAILS(crewMemberId) 
      });
    },
  });
};

export const useUpdateCrewStatus = (crewMemberId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { status: CrewStatus; notes?: string }) => 
      crewService.updateStatus(crewMemberId, data.status, data.notes),
    onSuccess: (data) => {
      // Update the crew member in the cache
      queryClient.setQueryData(QUERY_KEYS.CREW.DETAILS(crewMemberId), data);
      // Invalidate the crew members list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CREW.ALL });
    },
  });
};
