import { create } from 'zustand';
import { Company } from '@/lib/schemas';

interface CompanyState {
  company: Company | null;
  setCompany: (company: Company | null) => void;
  clearCompany: () => void;
}

export const useCompany = create<CompanyState>((set) => ({
  company: null,
  setCompany: (company) => set({ company }),
  clearCompany: () => set({ company: null }),
}));

export const useCurrentCompany = () => {
  const { company } = useCompany();
  
  if (!company) {
    throw new Error('No company found. Make sure to wrap your app with CompanyProvider.');
  }
  
  return company;
};
