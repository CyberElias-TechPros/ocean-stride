import React, { createContext, useContext, ReactNode } from 'react';
import { db } from '@/lib/database2';
import { useAuth } from '@/hooks/use-auth';

type DatabaseContextType = {
  isInitialized: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
};

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export const DatabaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isInitialized, setIsInitialized] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const { user } = useAuth();

  const initializeDatabase = async () => {
    try {
      if (!isInitialized) {
        await db.init();
        setIsInitialized(true);
        setError(null);
      }
    } catch (err) {
      console.error('Database initialization failed:', err);
      setError(err instanceof Error ? err : new Error('Failed to initialize database'));
    }
  };

  // Initialize database when user is authenticated
  React.useEffect(() => {
    if (user) {
      initializeDatabase();
    }
  }, [user]);

  const refresh = async () => {
    await initializeDatabase();
  };

  return (
    <DatabaseContext.Provider value={{ isInitialized, error, refresh }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabase = (): DatabaseContextType => {
  const context = useContext(DatabaseContext);
  if (context === undefined) {
    throw new Error('useDatabase must be used within a DatabaseProvider');
  }
  return context;
};
