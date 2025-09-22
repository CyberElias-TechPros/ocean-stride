import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES } from '@/lib/schemas_v2';

const db = DatabaseServiceV2.getInstance();

export interface Rank {
  id: string;
  name: string;
  department: 'deck' | 'engine' | 'catering' | 'other';
  level: number;
  baseSalary: number;
  currency: string;
  isOfficer: boolean;
  description?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

type RankCreateDto = Omit<Rank, 'id' | 'createdAt' | 'updatedAt'>;
type RankUpdateDto = Partial<Omit<Rank, 'id' | 'createdAt' | 'updatedAt'>>;

type RankListFilters = {
  search?: string;
  department?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

export const useRanks = (
  filters: RankListFilters = {},
  options?: Omit<UseQueryOptions<Rank[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Rank[], Error>({
    queryKey: ['ranks', filters],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<Rank>(STORE_NAMES.RANKS);
      
      // Apply filters
      if (filters.companyId) {
        results = await db.getByIndex<Rank>(STORE_NAMES.RANKS, 'by_company', filters.companyId);
      }
      if (filters.department && results.length > 0) {
        results = results.filter(rank => rank.department === filters.department);
      }
      if (filters.search && results.length > 0) {
        const searchTerm = filters.search.toLowerCase();
        results = results.filter(rank => 
          rank.name.toLowerCase().includes(searchTerm) ||
          rank.description?.toLowerCase().includes(searchTerm)
        );
      }
      
      return results.sort((a, b) => a.level - b.level);
    },
    ...options,
  });
};

export const useRank = (id: string, options?: Omit<UseQueryOptions<Rank | null, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Rank | null, Error>({
    queryKey: ['rank', id],
    queryFn: async () => {
      await db.init();
      return db.get<Rank>(STORE_NAMES.RANKS, id);
    },
    ...options,
  });
};

export const useCreateRank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RankCreateDto) => {
      await db.init();
      return db.create<Rank>(STORE_NAMES.RANKS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
    },
  });
};

export const useUpdateRank = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: RankUpdateDto) => {
      await db.init();
      return db.update<Rank>(STORE_NAMES.RANKS, id, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['rank', id], data);
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
    },
  });
};

export const useDeleteRank = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db.init();
      return db.delete(STORE_NAMES.RANKS, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['rank', id] });
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
    },
  });
};

// Initialize default maritime ranks
export const useInitializeDefaultRanks = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (companyId: string) => {
      await db.init();
      
      const defaultRanks: Omit<Rank, 'id' | 'createdAt' | 'updatedAt'>[] = [
        // Deck Department
        { name: 'Captain', department: 'deck', level: 1, baseSalary: 12000, currency: 'USD', isOfficer: true, companyId, description: 'Master of the vessel' },
        { name: 'Chief Officer', department: 'deck', level: 2, baseSalary: 8000, currency: 'USD', isOfficer: true, companyId, description: 'First mate' },
        { name: 'Second Officer', department: 'deck', level: 3, baseSalary: 6000, currency: 'USD', isOfficer: true, companyId, description: 'Navigation officer' },
        { name: 'Third Officer', department: 'deck', level: 4, baseSalary: 4500, currency: 'USD', isOfficer: true, companyId, description: 'Junior navigation officer' },
        { name: 'Bosun', department: 'deck', level: 5, baseSalary: 3500, currency: 'USD', isOfficer: false, companyId, description: 'Deck foreman' },
        { name: 'Able Seaman', department: 'deck', level: 6, baseSalary: 2500, currency: 'USD', isOfficer: false, companyId, description: 'Experienced deck crew' },
        { name: 'Ordinary Seaman', department: 'deck', level: 7, baseSalary: 1800, currency: 'USD', isOfficer: false, companyId, description: 'Entry level deck crew' },
        
        // Engine Department
        { name: 'Chief Engineer', department: 'engine', level: 1, baseSalary: 11000, currency: 'USD', isOfficer: true, companyId, description: 'Head of engine department' },
        { name: 'Second Engineer', department: 'engine', level: 2, baseSalary: 7500, currency: 'USD', isOfficer: true, companyId, description: 'Assistant chief engineer' },
        { name: 'Third Engineer', department: 'engine', level: 3, baseSalary: 5500, currency: 'USD', isOfficer: true, companyId, description: 'Watch keeping engineer' },
        { name: 'Fourth Engineer', department: 'engine', level: 4, baseSalary: 4000, currency: 'USD', isOfficer: true, companyId, description: 'Junior engineer' },
        { name: 'Electrician', department: 'engine', level: 5, baseSalary: 3800, currency: 'USD', isOfficer: false, companyId, description: 'Electrical systems specialist' },
        { name: 'Motorman', department: 'engine', level: 6, baseSalary: 2800, currency: 'USD', isOfficer: false, companyId, description: 'Engine room crew' },
        { name: 'Oiler', department: 'engine', level: 7, baseSalary: 2200, currency: 'USD', isOfficer: false, companyId, description: 'Engine maintenance crew' },
        { name: 'Wiper', department: 'engine', level: 8, baseSalary: 1600, currency: 'USD', isOfficer: false, companyId, description: 'Entry level engine crew' },
        
        // Catering Department
        { name: 'Chief Cook', department: 'catering', level: 1, baseSalary: 3200, currency: 'USD', isOfficer: false, companyId, description: 'Head of catering' },
        { name: 'Cook', department: 'catering', level: 2, baseSalary: 2400, currency: 'USD', isOfficer: false, companyId, description: 'Assistant cook' },
        { name: 'Messman', department: 'catering', level: 3, baseSalary: 1800, currency: 'USD', isOfficer: false, companyId, description: 'Galley and mess crew' },
      ];
      
      const createdRanks = [];
      for (const rankData of defaultRanks) {
        const rank = await db.create<Rank>(STORE_NAMES.RANKS, rankData);
        createdRanks.push(rank);
      }
      
      return createdRanks;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ranks'] });
    },
  });
};