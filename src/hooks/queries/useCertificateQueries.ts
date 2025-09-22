import { useQuery, useMutation, useQueryClient, UseQueryOptions } from '@tanstack/react-query';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES } from '@/lib/schemas_v2';

const db = DatabaseServiceV2.getInstance();

export interface Certificate {
  id: string;
  name: string;
  type: 'license' | 'certificate' | 'endorsement' | 'medical' | 'training';
  number: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  issuePlace?: string;
  seafarerId: string;
  fileUrl?: string;
  status: 'valid' | 'expired' | 'expiring_soon' | 'renewed';
  notes?: string;
  companyId?: string;
  createdAt: string;
  updatedAt: string;
}

type CertificateCreateDto = Omit<Certificate, 'id' | 'createdAt' | 'updatedAt' | 'status'>;
type CertificateUpdateDto = Partial<Omit<Certificate, 'id' | 'createdAt' | 'updatedAt'>>;

type CertificateListFilters = {
  search?: string;
  seafarerId?: string;
  type?: string;
  status?: string;
  expiringWithinDays?: number;
  page?: number;
  limit?: number;
};

export const useCertificates = (
  filters: CertificateListFilters = {},
  options?: Omit<UseQueryOptions<Certificate[], Error>, 'queryKey' | 'queryFn'>
) => {
  return useQuery<Certificate[], Error>({
    queryKey: ['certificates', filters],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
      
      // Apply filters
      if (filters.seafarerId) {
        results = await db.getByIndex<Certificate>(STORE_NAMES.CERTIFICATES, 'by_seafarer', filters.seafarerId);
      }
      if (filters.type && results.length > 0) {
        results = results.filter(cert => cert.type === filters.type);
      }
      if (filters.status && results.length > 0) {
        results = results.filter(cert => cert.status === filters.status);
      }
      if (filters.search && results.length > 0) {
        const searchTerm = filters.search.toLowerCase();
        results = results.filter(cert => 
          cert.name.toLowerCase().includes(searchTerm) ||
          cert.number.toLowerCase().includes(searchTerm) ||
          cert.issuingAuthority.toLowerCase().includes(searchTerm)
        );
      }
      if (filters.expiringWithinDays && results.length > 0) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() + filters.expiringWithinDays);
        results = results.filter(cert => new Date(cert.expiryDate) <= cutoffDate);
      }
      
      // Update status based on expiry date
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      results = results.map(cert => {
        const expiryDate = new Date(cert.expiryDate);
        let status: Certificate['status'] = 'valid';
        
        if (expiryDate < now) {
          status = 'expired';
        } else if (expiryDate <= thirtyDaysFromNow) {
          status = 'expiring_soon';
        }
        
        return { ...cert, status };
      });
      
      return results.sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    },
    ...options,
  });
};

export const useCertificate = (id: string, options?: Omit<UseQueryOptions<Certificate | null, Error>, 'queryKey' | 'queryFn'>) => {
  return useQuery<Certificate | null, Error>({
    queryKey: ['certificate', id],
    queryFn: async () => {
      await db.init();
      return db.get<Certificate>(STORE_NAMES.CERTIFICATES, id);
    },
    ...options,
  });
};

export const useCreateCertificate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CertificateCreateDto) => {
      await db.init();
      // Auto-determine status based on expiry date
      const now = new Date();
      const expiryDate = new Date(data.expiryDate);
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);
      
      let status: Certificate['status'] = 'valid';
      if (expiryDate < now) {
        status = 'expired';
      } else if (expiryDate <= thirtyDaysFromNow) {
        status = 'expiring_soon';
      }
      
      return db.create<Certificate>(STORE_NAMES.CERTIFICATES, { ...data, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
    },
  });
};

export const useUpdateCertificate = (id: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: CertificateUpdateDto) => {
      await db.init();
      return db.update<Certificate>(STORE_NAMES.CERTIFICATES, id, data);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['certificate', id], data);
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
    },
  });
};

export const useDeleteCertificate = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await db.init();
      return db.delete(STORE_NAMES.CERTIFICATES, id);
    },
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: ['certificate', id] });
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      queryClient.invalidateQueries({ queryKey: ['seafarers'] });
    },
  });
};

export const useExpiringCertificates = (days: number = 30) => {
  return useQuery({
    queryKey: ['expiring-certificates', days],
    queryFn: async () => {
      await db.init();
      const certificates = await db.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() + days);
      
      return certificates.filter(cert => {
        const expiryDate = new Date(cert.expiryDate);
        return expiryDate <= cutoffDate && expiryDate >= new Date();
      });
    },
  });
};

export const useExpiredCertificates = () => {
  return useQuery({
    queryKey: ['expired-certificates'],
    queryFn: async () => {
      await db.init();
      const certificates = await db.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
      
      return certificates.filter(cert => new Date(cert.expiryDate) < new Date());
    },
  });
};