import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES } from '@/lib/schemas_v2';
import { Company } from '@/lib/schemas_v2';

const db = DatabaseServiceV2.getInstance();

type CompanyListFilters = {
  search?: string;
  page?: number;
  limit?: number;
};

type CompanyCreateDto = Omit<Company, 'id' | 'createdAt' | 'updatedAt'>;
type CompanyUpdateDto = Partial<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>>;

export const useCompanies = (
  filters: CompanyListFilters = {},
  options?: Omit<UseQueryOptions<Company[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Company[], Error>({
    queryKey: ['companies', filters],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<Company>(STORE_NAMES.COMPANIES);
      
      // Apply search filter
      if (filters.search && results.length > 0) {
        const searchTerm = filters.search.toLowerCase();
        results = results.filter(company => 
          company.name.toLowerCase().includes(searchTerm) ||
          company.email.toLowerCase().includes(searchTerm)
        );
      }
      
      return results;
    },
    ...options,
  });
};

export const useCompany = (id: string, options?: Omit<UseQueryOptions<Company | null, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Company | null, Error>({
    queryKey: ['company', id],
    queryFn: async () => {
      await db.init();
      return db.get<Company>(STORE_NAMES.COMPANIES, id);
    },
    ...options,
  });
};

export const useCreateCompany = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CompanyCreateDto) => {
      await db.init();
      return db.create<Company>(STORE_NAMES.COMPANIES, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

export const useUpdateCompany = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CompanyUpdateDto) => {
      await db.init();
      return db.update<Company>(STORE_NAMES.COMPANIES, id, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['company', id], data);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

export const useDeleteCompany = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db.init();
      return db.delete(STORE_NAMES.COMPANIES, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['company', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });
};

export const useCompanyStats = (companyId: string) => {
  return useQuery({
    queryKey: ['company-stats', companyId],
    queryFn: async () => {
      await db.init();
      
      const [vessels, seafarers, assignments] = await Promise.all([
        db.getByIndex(STORE_NAMES.VESSELS, 'by_company', companyId),
        db.getByIndex(STORE_NAMES.SEAFARERS, 'by_company', companyId),
        db.getByIndex(STORE_NAMES.CREW_ASSIGNMENTS, 'by_company', companyId),
      ]);
      
      const activeAssignments = assignments.filter((a: any) => a.status === 'active');
      const activeVessels = vessels.filter((v: any) => v.status === 'active');
      const activeSeafarers = seafarers.filter((s: any) => s.employment.status === 'onboard');
      
      return {
        totalVessels: vessels.length,
        activeVessels: activeVessels.length,
        totalSeafarers: seafarers.length,
        activeSeafarers: activeSeafarers.length,
        totalAssignments: assignments.length,
        activeAssignments: activeAssignments.length,
      };
    },
  });
};