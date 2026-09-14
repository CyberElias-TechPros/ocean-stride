import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../lib/database';
import { toast } from '../components/ui/use-toast';

interface DatabaseContextType {
  isInitialized: boolean;
  error: Error | null;
  initialize: () => Promise<void>;
  clearDatabase: () => Promise<void>;
  // Database operations can be added here as needed
}

const DatabaseContext = createContext<DatabaseContextType | null>(null);

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const initialize = async () => {
    try {
      await db.init();
      setIsInitialized(true);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to initialize database');
      console.error('Database initialization error:', error);
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Database Error',
        description: 'Failed to initialize the database. Please refresh the page or contact support.',
      });
    }
  };

  const clearDatabase = async () => {
    try {
      // Clear all data from all stores
      const stores = ['seafarers', 'vessels', 'companies', 'payroll', 'rosters'];
      
      for (const store of stores) {
        const items = await db.getAll<{ id: string }>(store);
        await Promise.all(items.map(item => db.delete(store, item.id)));
      }
      
      toast({
        title: 'Database Cleared',
        description: 'All local data has been cleared.',
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to clear database');
      console.error('Failed to clear database:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear the database.',
      });
      throw error;
    }
  };

  useEffect(() => {
    initialize();
    
    // Cleanup on unmount
    return () => {
      // Any cleanup if needed
    };
  }, []);

  return (
    <DatabaseContext.Provider
      value={{
        isInitialized,
        error,
        initialize,
        clearDatabase,
        // Add any database operations here
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

// Helper hook for database operations
export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
}

// Use this hook to access database operations
export function useDatabaseOperations() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabaseOperations must be used within a DatabaseProvider');
  }
  return context;
}
