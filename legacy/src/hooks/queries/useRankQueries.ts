import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { db } from '@/lib/database_v2';
import { STORE_NAMES, Rank } from '@/lib/schemas_v2';

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
        {
          name: 'Captain',
          code: 'CAP',
          department: 'deck',
          level: 1,
          baseSalary: 12000,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Master of the vessel',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 500, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Master Mariner', 'STCW Management', 'GMDSS']
        },
        {
          name: 'Chief Officer',
          code: 'CO',
          department: 'deck',
          level: 2,
          baseSalary: 8000,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'First mate',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 400, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Chief Mate', 'STCW Management', 'GMDSS']
        },
        {
          name: 'Second Officer',
          code: '2O',
          department: 'deck',
          level: 3,
          baseSalary: 6000,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Navigation officer',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 350, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Officer of the Watch', 'STCW Operational', 'GMDSS']
        },
        {
          name: 'Third Officer',
          code: '3O',
          department: 'deck',
          level: 4,
          baseSalary: 4500,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Junior navigation officer',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 300, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Officer of the Watch', 'STCW Operational']
        },
        {
          name: 'Bosun',
          code: 'BSN',
          department: 'deck',
          level: 5,
          baseSalary: 3500,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Deck foreman',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 250, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Able Seafarer Deck', 'STCW Basic Safety']
        },
        {
          name: 'Able Seaman',
          code: 'AB',
          department: 'deck',
          level: 6,
          baseSalary: 2500,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Experienced deck crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 200, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Able Seafarer Deck', 'STCW Basic Safety']
        },
        {
          name: 'Ordinary Seaman',
          code: 'OS',
          department: 'deck',
          level: 7,
          baseSalary: 1800,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Entry level deck crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 150, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['STCW Basic Safety']
        },

        // Engine Department
        {
          name: 'Chief Engineer',
          code: 'CE',
          department: 'engine',
          level: 1,
          baseSalary: 11000,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Head of engine department',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 450, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Chief Engineer', 'STCW Management', 'Engine Room Watch']
        },
        {
          name: 'Second Engineer',
          code: '2E',
          department: 'engine',
          level: 2,
          baseSalary: 7500,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Assistant chief engineer',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 400, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Second Engineer', 'STCW Operational', 'Engine Room Watch']
        },
        {
          name: 'Third Engineer',
          code: '3E',
          department: 'engine',
          level: 3,
          baseSalary: 5500,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Watch keeping engineer',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 350, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Third Engineer', 'STCW Operational', 'Engine Room Watch']
        },
        {
          name: 'Fourth Engineer',
          code: '4E',
          department: 'engine',
          level: 4,
          baseSalary: 4000,
          currency: 'USD',
          isOfficer: true,
          companyId,
          description: 'Junior engineer',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 300, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 200, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Fourth Engineer', 'STCW Operational']
        },
        {
          name: 'Electrician',
          code: 'EL',
          department: 'engine',
          level: 5,
          baseSalary: 3800,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Electrical systems specialist',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 250, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Electro-Technical Officer', 'STCW Basic Safety']
        },
        {
          name: 'Motorman',
          code: 'MT',
          department: 'engine',
          level: 6,
          baseSalary: 2800,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Engine room crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 200, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Engine Rating', 'STCW Basic Safety']
        },
        {
          name: 'Oiler',
          code: 'OL',
          department: 'engine',
          level: 7,
          baseSalary: 2200,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Engine maintenance crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 180, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Engine Rating', 'STCW Basic Safety']
        },
        {
          name: 'Wiper',
          code: 'WP',
          department: 'engine',
          level: 8,
          baseSalary: 1600,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Entry level engine crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 150, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['STCW Basic Safety']
        },

        // Catering Department
        {
          name: 'Chief Cook',
          code: 'CC',
          department: 'catering',
          level: 1,
          baseSalary: 3200,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Head of catering',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 200, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Ship Cook', 'Food Hygiene']
        },
        {
          name: 'Cook',
          code: 'CK',
          department: 'catering',
          level: 2,
          baseSalary: 2400,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Assistant cook',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 180, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Ship Cook', 'Food Hygiene']
        },
        {
          name: 'Messman',
          code: 'MS',
          department: 'catering',
          level: 3,
          baseSalary: 1800,
          currency: 'USD',
          isOfficer: false,
          companyId,
          description: 'Galley and mess crew',
          overtimeRates: { regular: 1.5, weekend: 2.0, holiday: 2.5 },
          allowances: [
            { type: 'sea_time', amount: 150, description: 'Sea time allowance' },
            { type: 'subsistence', amount: 150, description: 'Daily subsistence' }
          ],
          certificateRequirements: ['Food Hygiene', 'STCW Basic Safety']
        },
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