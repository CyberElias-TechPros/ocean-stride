import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { db } from '@/lib/database2_fixed';
import type { Company } from '@/lib/schemas';
import { STORE_NAMES } from '@/lib/schemas';

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
  const initializedRef = useRef(false);

  const setSelectedCompany = (company: Company) => {
    setSelectedCompanyState(company);
    localStorage.setItem('selectedCompanyId', company.id);
  };

  const loadCompanies = async () => {
    try {
      // Initialize the database
      await db.init();
      
      // Get all companies
      let companiesData: Company[] = [];
      try {
        companiesData = await db.getAll<Company>(STORE_NAMES.COMPANIES);
      } catch (error) {
        console.error('Error fetching companies:', error);
        return;
      }
      
      // If no companies exist, create sample data
      if (companiesData.length === 0) {
        console.log('No companies found, creating sample data...');
        
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

        // Create sample companies
        for (const company of sampleCompanies) {
          try {
            await db.create<Company>(STORE_NAMES.COMPANIES, company);
          } catch (err) {
            console.warn('Error creating sample company:', company.name, err);
          }
        }
        
        // Reload companies after creating samples
        try {
          companiesData = await db.getAll<Company>(STORE_NAMES.COMPANIES);
        } catch (error) {
          console.error('Error reloading companies after seeding:', error);
          return;
        }
      }
      
      // Update state with loaded companies
      setCompanies(companiesData);
      
      // Handle company selection
      if (companiesData.length > 0) {
        // Try to restore selected company from localStorage
        const savedCompanyId = localStorage.getItem('selectedCompanyId');
        const savedCompany = companiesData.find(c => c.id === savedCompanyId);
        
        if (savedCompany) {
          setSelectedCompany(savedCompany);
        } else {
          // Default to first company if none is saved
          setSelectedCompany(companiesData[0]);
        }
      }
    } catch (error) {
      console.error('Failed to load companies:', error);
      // You might want to show an error to the user here
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