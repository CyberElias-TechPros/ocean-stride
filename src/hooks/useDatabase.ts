import { useState, useEffect } from 'react';
import { db } from '@/lib/database';
import type { Company, Seafarer, Vessel } from '@/lib/schemas_v2';
import { STORE_NAMES } from '@/lib/schemas_v2';

import { useToast } from '@/hooks/use-toast';

interface DatabaseState {
  isInitialized: boolean;
  isLoading: boolean;
  error: Error | null;
}

export const useDatabase = () => {
  const [state, setState] = useState<DatabaseState>({
    isInitialized: false,
    isLoading: true,
    error: null
  });
  const { toast } = useToast();

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        await db.init();
        setState(prev => ({ ...prev, isInitialized: true, isLoading: false }));
      } catch (error) {
        const errorObj = error instanceof Error ? error : new Error('Database initialization failed');
        setState(prev => ({ ...prev, error: errorObj, isLoading: false }));
        toast({
          variant: 'destructive',
          title: 'Database Error',
          description: 'Failed to initialize database. Please refresh the page.',
        });
      }
    };

    initializeDatabase();
  }, [toast]);

  return state;
};

export const useCompanies = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadCompanies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await db.getAll<Company>('companies');
      setCompanies(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load companies');
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load companies',
      });
    } finally {
      setLoading(false);
    }
  };

  const createCompany = async (companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newCompany = await db.createCompany(companyData);
      setCompanies(prev => [...prev, newCompany]);
      toast({
        title: 'Success',
        description: 'Company created successfully',
      });
      return newCompany;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create company');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateCompany = async (id: string, updates: Partial<Company>) => {
    try {
      const updatedCompany = await db.updateCompany(id, updates);
      setCompanies(prev => prev.map(c => c.id === id ? updatedCompany : c));
      toast({
        title: 'Success',
        description: 'Company updated successfully',
      });
      return updatedCompany;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update company');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteCompany = async (id: string) => {
    try {
      await db.delete('companies', id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete company');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  return {
    companies,
    loading,
    error,
    loadCompanies,
    createCompany,
    updateCompany,
    deleteCompany
  };
};

export const useSeafarers = (companyId?: string) => {
  const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadSeafarers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = companyId 
        ? await db.getSeafarersByCompany(companyId)
        : await db.getAll<Seafarer>('seafarers');
      setSeafarers(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load seafarers');
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load seafarers',
      });
    } finally {
      setLoading(false);
    }
  };

  const createSeafarer = async (seafarerData: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newSeafarer = await db.createSeafarer(seafarerData);
      setSeafarers(prev => [...prev, newSeafarer]);
      toast({
        title: 'Success',
        description: 'Seafarer created successfully',
      });
      return newSeafarer;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create seafarer');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateSeafarer = async (id: string, updates: Partial<Seafarer>) => {
    try {
      const updatedSeafarer = await db.update<Seafarer>(STORE_NAMES.SEAFARERS, id, updates);
      setSeafarers(prev => prev.map(s => s.id === id ? updatedSeafarer : s));
      toast({
        title: 'Success',
        description: 'Seafarer updated successfully',
      });
      return updatedSeafarer;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update seafarer');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteSeafarer = async (id: string) => {
    try {
      await db.delete('seafarers', id);
      setSeafarers(prev => prev.filter(s => s.id !== id));
      toast({
        title: 'Success',
        description: 'Seafarer deleted successfully',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete seafarer');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    loadSeafarers();
  }, [companyId]);

  return {
    seafarers,
    loading,
    error,
    loadSeafarers,
    createSeafarer,
    updateSeafarer,
    deleteSeafarer
  };
};

export const useVessels = (companyId?: string) => {
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadVessels = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = companyId 
        ? await db.getVesselsByCompany(companyId)
        : await db.getAll<Vessel>('vessels');
      setVessels(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load vessels');
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load vessels',
      });
    } finally {
      setLoading(false);
    }
  };

  const createVessel = async (vesselData: Omit<Vessel, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const newVessel = await db.createVessel(vesselData);
      setVessels(prev => [...prev, newVessel]);
      toast({
        title: 'Success',
        description: 'Vessel created successfully',
      });
      return newVessel;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to create vessel');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateVessel = async (id: string, updates: Partial<Vessel>) => {
    try {
      const updatedVessel = await db.update<Vessel>(STORE_NAMES.VESSELS, id, updates);
      setVessels(prev => prev.map(v => v.id === id ? updatedVessel : v));
      toast({
        title: 'Success',
        description: 'Vessel updated successfully',
      });
      return updatedVessel;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update vessel');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteVessel = async (id: string) => {
    try {
      await db.delete('vessels', id);
      setVessels(prev => prev.filter(v => v.id !== id));
      toast({
        title: 'Success',
        description: 'Vessel deleted successfully',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to delete vessel');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  return {
    vessels,
    loading,
    error,
    loadVessels,
    createVessel,
    updateVessel,
    deleteVessel
  };
};