import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '@/lib/database2';
import type { Company } from '@/lib/schemas';
import { STORE_NAMES } from '@/lib/schemas';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
  isLoading: boolean;
  setSelectedCompany: (company: Company) => void;
  loadCompanies: () => Promise<void>;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};

// Hook that provides the currently selected company
export const useCurrentCompany = () => {
  const { selectedCompany } = useCompany();
  
  if (!selectedCompany) {
    throw new Error('No company found. Make sure to wrap your app with CompanyProvider and a company is selected.');
  }
  
  return selectedCompany;
};

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);
  const { user } = useAuth();

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const loadCompanies = async () => {
    setIsLoading(true);
    try {
      // Initialize the canonical data layer (no-op in remote mode).
      await db.init();

      // Get companies the current user is allowed to see.
      const companiesData = await db.getAll<Company>(STORE_NAMES.COMPANIES);
      setCompanies(companiesData);

      if (companiesData.length === 0) {
        setSelectedCompanyState(null);
        return;
      }

      // Prefer the company the authenticated user belongs to, then the last
      // selection saved locally, then the first available company.
      const preferredId = user?.companyId || localStorage.getItem('selectedCompanyId');
      const preferred = companiesData.find((c) => c.id === preferredId) || companiesData[0];
      setSelectedCompanyState(preferred);
      localStorage.setItem('selectedCompanyId', preferred.id);
    } catch (error) {
      console.error('Failed to load companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load companies once per authenticated session. This runs after the auth
  // context has resolved because `user.id` is only available then.
  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    if (loadedUserIdRef.current === userId) return;
    loadedUserIdRef.current = userId;
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Re-select the user's company whenever the authenticated user changes.
  useEffect(() => {
    if (user?.companyId && companies.length > 0) {
      const match = companies.find((c) => c.id === user.companyId);
      if (match) setSelectedCompanyState(match);
    }
  }, [user?.companyId, companies]);

  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      companies,
      isLoading,
      setSelectedCompany,
      loadCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};