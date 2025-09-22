import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES, QUERY_KEYS } from '@/lib/query-client';
import { Payroll } from '@/types/payroll.types';
import { PayrollCreateDto, PayrollUpdateDto } from '@/types/payroll.types';

const db = DatabaseServiceV2.getInstance();

type PayrollListFilters = {
  search?: string;
  seafarerId?: string;
  vesselId?: string;
  status?: string;
  companyId?: string;
  page?: number;
  limit?: number;
};

export const usePayrolls = (
  filters: PayrollListFilters = {},
  options?: Omit<UseQueryOptions<Payroll[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Payroll[], Error>({
    queryKey: ['payrolls', filters],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<Payroll>(STORE_NAMES.PAYROLLS);
      
      // Apply filters
      if (filters.seafarerId) {
        results = await db.getByIndex<Payroll>(STORE_NAMES.PAYROLLS, 'by_seafarer', filters.seafarerId);
      }
      if (filters.vesselId && results.length > 0) {
        results = results.filter(p => p.vesselId === filters.vesselId);
      }
      if (filters.status && results.length > 0) {
        results = results.filter(p => p.status === filters.status);
      }
      if (filters.companyId && results.length > 0) {
        results = results.filter(p => p.companyId === filters.companyId);
      }
      
      return results;
    },
    ...options,
  });
};

export const usePayroll = (id: string, options?: Omit<UseQueryOptions<Payroll | null, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Payroll | null, Error>({
    queryKey: ['payroll', id],
    queryFn: async () => {
      await db.init();
      return db.get<Payroll>(STORE_NAMES.PAYROLLS, id);
    },
    ...options,
  });
};

export const useCreatePayroll = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PayrollCreateDto) => {
      await db.init();
      return db.create<Payroll>(STORE_NAMES.PAYROLLS, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });
};

export const useUpdatePayroll = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PayrollUpdateDto) => {
      await db.init();
      return db.update<Payroll>(STORE_NAMES.PAYROLLS, id, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['payroll', id], data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });
};

export const useDeletePayroll = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db.init();
      return db.delete(STORE_NAMES.PAYROLLS, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['payroll', id] });
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });
};

export const useApprovePayroll = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ approvedBy }: { approvedBy: string }) => {
      await db.init();
      return db.update<Payroll>(STORE_NAMES.PAYROLLS, id, {
        status: 'approved',
        approvedBy,
        approvedAt: new Date().toISOString(),
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['payroll', id], data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });
};

export const usePayPayroll = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ paidBy, paymentReference }: { paidBy: string; paymentReference?: string }) => {
      await db.init();
      return db.update<Payroll>(STORE_NAMES.PAYROLLS, id, {
        status: 'paid',
        paidBy,
        paidAt: new Date().toISOString(),
        paymentReference,
      });
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['payroll', id], data);
      queryClient.invalidateQueries({ queryKey: ['payrolls'] });
    },
  });
};