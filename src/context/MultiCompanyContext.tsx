import React, { createContext, useContext, useEffect, useState } from 'react';
import { companyService } from '@/lib/multiCompanyService';
import type { Company } from '@/lib/schemas';

interface MultiCompanyContextType {
  currentCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  error: Error | null;
  setCurrentCompany: (companyId: string) => Promise<void>;
  createCompany: (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Company>;
  refreshCompanies: () => Promise<void>;
}

const MultiCompanyContext = createContext<MultiCompanyContextType | undefined>(undefined);

export const MultiCompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentCompany, setCurrentCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadCompanies = async () => {
    try {
      setIsLoading(true);
      const [allCompanies, current] = await Promise.all([
        companyService.getAllCompanies(),
        companyService.getCurrentCompany(),
      ]);
      
      setCompanies(allCompanies);
      setCurrentCompanyState(current);
      setError(null);
    } catch (err) {
      console.error('Failed to load companies:', err);
      setError(err instanceof Error ? err : new Error('Failed to load companies'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCurrentCompany = async (companyId: string) => {
    try {
      setIsLoading(true);
      const company = await companyService.setCurrentCompany(companyId);
      setCurrentCompanyState(company);
      setError(null);
    } catch (err) {
      console.error('Failed to set current company:', err);
      setError(err instanceof Error ? err : new Error('Failed to set company'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setIsLoading(true);
      const newCompany = await companyService.createCompany(companyData);
      await loadCompanies();
      return newCompany;
    } catch (err) {
      console.error('Failed to create company:', err);
      setError(err instanceof Error ? err : new Error('Failed to create company'));
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <MultiCompanyContext.Provider
      value={{
        currentCompany,
        companies,
        isLoading,
        error,
        setCurrentCompany: handleSetCurrentCompany,
        createCompany: handleCreateCompany,
        refreshCompanies: loadCompanies,
      }}
    >
      {children}
    </MultiCompanyContext.Provider>
  );
};

export const useMultiCompany = (): MultiCompanyContextType => {
  const context = useContext(MultiCompanyContext);
  if (context === undefined) {
    throw new Error('useMultiCompany must be used within a MultiCompanyProvider');
  }
  return context;
};

// Higher-order component for company-scoped data fetching
export function withCompanyScope<P>(
  WrappedComponent: React.ComponentType<P & { companyId: string }>,
  options: { requireCompany?: boolean } = { requireCompany: true }
) {
  return function WithCompanyScope(props: P) {
    const { currentCompany, isLoading } = useMultiCompany();

    if (isLoading) {
      return <div>Loading company data...</div>;
    }

    if (options.requireCompany && !currentCompany) {
      return <div>No company selected. Please select a company to continue.</div>;
    }

    return <WrappedComponent {...props} companyId={currentCompany!.id} />;
  };
}
