import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { vesselService } from '@/services';
import { QUERY_KEYS } from '@/lib/query-client';
import { Vessel, PaginatedResponse, VesselStatus } from '@/types';

type VesselListFilters = {
  search?: string;
  status?: VesselStatus;
  page?: number;
  limit?: number;
};

export const useVessels = (
  filters: VesselListFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<Vessel>, Error>, 'queryKey' | 'queryFn'>
) => {
  const { page = 1, limit = 10, ...rest } = filters;
  
  return useQuery<PaginatedResponse<Vessel>, Error>({
    queryKey: QUERY_KEYS.VESSELS.LISTS(filters),
    queryFn: () => vesselService.getVessels(page, limit, rest.search, rest.status),
    keepPreviousData: true,
    ...options,
  });
};

export const useVessel = (id: string, options?: Omit<UseQueryOptions<Vessel, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Vessel, Error>({
    queryKey: QUERY_KEYS.VESSELS.DETAILS(id),
    queryFn: () => vesselService.getVesselById(id),
    ...options,
  });
};

export const useCreateVessel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: vesselService.createVessel,
    onSuccess: () => {
      // Invalidate the vessels list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.ALL });
    },
  });
};

export const useUpdateVessel = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: Parameters<typeof vesselService.updateVessel>[1]) => 
      vesselService.updateVessel(id, data),
    onSuccess: (data) => {
      // Update the vessel in the cache
      queryClient.setQueryData(QUERY_KEYS.VESSELS.DETAILS(id), data);
      // Invalidate the vessels list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.ALL });
    },
  });
};

export const useDeleteVessel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: string) => vesselService.deleteVessel(id),
    onSuccess: (_, id) => {
      // Remove the vessel from the cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.VESSELS.DETAILS(id) });
      // Invalidate the vessels list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.ALL });
    },
  });
};

export const useVesselCrew = (vesselId: string, page = 1, limit = 10) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.VESSELS.CREW(vesselId), { page, limit }],
    queryFn: () => vesselService.getVesselCrew(vesselId, page, limit),
    keepPreviousData: true,
    enabled: !!vesselId,
  });
};

export const useAddCrewToVessel = (vesselId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { crewMemberId: string; position: string; startDate: string; endDate?: string }) => 
      vesselService.addCrewMember(vesselId, data.crewMemberId, data.position, data.startDate, data.endDate),
    onSuccess: () => {
      // Invalidate the vessel crew list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.CREW(vesselId) });
    },
  });
};

export const useRemoveCrewFromVessel = (vesselId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (crewMemberId: string) => 
      vesselService.removeCrewMember(vesselId, crewMemberId),
    onSuccess: () => {
      // Invalidate the vessel crew list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.CREW(vesselId) });
    },
  });
};

export const useUploadVesselImage = (vesselId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { file: File; isPrimary?: boolean }) => 
      vesselService.uploadVesselImage(vesselId, data.file, data.isPrimary),
    onSuccess: (data, { isPrimary }) => {
      // Update the vessel in the cache with the new image
      if (isPrimary) {
        queryClient.setQueryData<Vessel | undefined>(
          QUERY_KEYS.VESSELS.DETAILS(vesselId),
          (old) => old ? { ...old, imageUrl: data.url } : undefined
        );
      }
      // Invalidate the vessel to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.DETAILS(vesselId) });
    },
  });
};

export const useUpdateVesselStatus = (vesselId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { status: VesselStatus; notes?: string }) => 
      vesselService.updateVesselStatus(vesselId, data.status, data.notes),
    onSuccess: (data) => {
      // Update the vessel in the cache
      queryClient.setQueryData(QUERY_KEYS.VESSELS.DETAILS(vesselId), data);
      // Invalidate the vessels list to refetch
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VESSELS.ALL });
    },
  });
};
