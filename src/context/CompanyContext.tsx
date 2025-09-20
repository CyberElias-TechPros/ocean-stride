import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '@/lib/database2';
import type { Company } from '@/lib/schemas';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas';

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
  const initializedRef = useRef(false);

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const loadCompanies = async () => {
    try {
      await db.init();
      const companiesData = await db.getAll<Company>(STORE_NAMES.COMPANIES);
      
      if (companiesData.length === 0) {
        // Create sample companies (new schema: flat address string, no code field)
        const sampleCompanies: Array<Omit<Company, 'id' | 'createdAt' | 'updatedAt'>> = [
          {
            name: 'Maritime Solutions Inc.',
            address: '123 Harbor View, Singapore 018956, Singapore',
            phone: '+65-6555-0123',
            email: 'info@maritimesolutions.com',
            website: 'https://maritimesolutions.com',
            settings: {
              currency: 'USD',
              dateFormat: 'MM/dd/yyyy',
              timezone: 'Asia/Singapore',
            },
            logoUrl: undefined,
            taxId: undefined,
          },
          {
            name: 'Global Shipping Corp',
            address: '456 Ocean Drive, 3011 BK Rotterdam, Netherlands',
            phone: '+31-10-555-0456',
            email: 'contact@globalshipping.nl',
            website: 'https://globalshipping.nl',
            settings: {
              currency: 'EUR',
              dateFormat: 'dd/MM/yyyy',
              timezone: 'Europe/Amsterdam',
            },
            logoUrl: undefined,
            taxId: undefined,
          },
          {
            name: 'Pacific Fleet Services',
            address: '789 Waterfront Blvd, Los Angeles, CA 90731, USA',
            phone: '+1-310-555-0789',
            email: 'admin@pacificfleet.com',
            website: 'https://pacificfleet.com',
            settings: {
              currency: 'USD',
              dateFormat: 'MM/dd/yyyy',
              timezone: 'America/Los_Angeles',
            },
            logoUrl: undefined,
            taxId: undefined,
          },
        ];

        for (const c of sampleCompanies) {
          // Check by unique name index to avoid duplicates (Strict Mode double-invoke)
          const existingByName = await db.getByIndex<Company>(
            STORE_NAMES.COMPANIES,
            INDEX_NAMES.COMPANY_BY_NAME,
            c.name
          );
          if (!existingByName || existingByName.length === 0) {
            try {
              await db.createCompany(c);
            } catch (err) {
              // Ignore ConstraintError if another render just created it
              console.warn('[Company] Skipping duplicate company seed for', c.name, err);
            }
          }
        }
        
        const newCompanies = await db.getAll<Company>(STORE_NAMES.COMPANIES);
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
    if (initializedRef.current) return;
    initializedRef.current = true;
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