import React, { createContext, useContext, useState, useEffect } from 'react';
import { Company, db } from '@/lib/database';

interface CompanyContextType {
  selectedCompany: Company | null;
  companies: Company[];
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

export const CompanyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCompany, setSelectedCompanyState] = useState<Company | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const loadCompanies = async () => {
    try {
      await db.init();
      const companiesData = await db.getAll<Company>('companies');
      
      if (companiesData.length === 0) {
        // Create sample companies
        const sampleCompanies = [
          {
            name: 'Maritime Solutions Inc.',
            code: 'MSI',
            address: {
              street: '123 Harbor View',
              city: 'Singapore',
              country: 'Singapore',
              postalCode: '018956',
            },
            contact: {
              email: 'info@maritimesolutions.com',
              phone: '+65-6555-0123',
              website: 'https://maritimesolutions.com',
            },
            settings: {
              currency: 'USD',
              timezone: 'Asia/Singapore',
              fiscalYearStart: '01-01',
            },
          },
          {
            name: 'Global Shipping Corp',
            code: 'GSC',
            address: {
              street: '456 Ocean Drive',
              city: 'Rotterdam',
              country: 'Netherlands',
              postalCode: '3011 BK',
            },
            contact: {
              email: 'contact@globalshipping.nl',
              phone: '+31-10-555-0456',
              website: 'https://globalshipping.nl',
            },
            settings: {
              currency: 'EUR',
              timezone: 'Europe/Amsterdam',
              fiscalYearStart: '01-01',
            },
          },
          {
            name: 'Pacific Fleet Services',
            code: 'PFS',
            address: {
              street: '789 Waterfront Blvd',
              city: 'Los Angeles',
              country: 'USA',
              postalCode: '90731',
            },
            contact: {
              email: 'admin@pacificfleet.com',
              phone: '+1-310-555-0789',
              website: 'https://pacificfleet.com',
            },
            settings: {
              currency: 'USD',
              timezone: 'America/Los_Angeles',
              fiscalYearStart: '01-01',
            },
          },
        ];

        for (const company of sampleCompanies) {
          await db.createCompany(company);
        }
        
        const newCompanies = await db.getAll<Company>('companies');
        setCompanies(newCompanies);
        
        // Auto-select first company
        if (newCompanies.length > 0) {
          setSelectedCompany(newCompanies[0]);
        }
      } else {
        setCompanies(companiesData);
        
        // Try to restore selected company from localStorage
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        const savedCompany = companiesData.find(c => c.id === savedCompanyId);
        
        if (savedCompany) {
          setSelectedCompanyState(savedCompany);
        } else if (companiesData.length > 0) {
          setSelectedCompany(companiesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  return (
    <CompanyContext.Provider value={{
      selectedCompany,
      companies,
      setSelectedCompany,
      loadCompanies,
    }}>
      {children}
    </CompanyContext.Provider>
  );
};