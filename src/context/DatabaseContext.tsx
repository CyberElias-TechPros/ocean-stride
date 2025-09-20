import React, { createContext, useContext, ReactNode } from 'react';
import { db } from '@/lib/database2';
import type { Applicant } from '@/lib/schemas';
import { runMigrationIfNeeded } from '@/lib/migrate';
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
        // Attempt migration from legacy DB if applicable
        try {
          const migrated = await runMigrationIfNeeded();
          if (migrated) {
            console.log('[Database] Migration completed.');
          }
        } catch (migrateErr) {
          console.warn('[Database] Migration check failed:', migrateErr);
        }

        // Seed deterministic applicants once for demo/testing
        try {
          const seededKey = 'os_seeded_applicants_v2';
          if (!localStorage.getItem(seededKey)) {
            const companyId = (user as any)?.companyId || undefined;
            if (companyId) {
              const existing = await db.getApplicantsByCompany(companyId);
              if (existing.length === 0) {
                const sample: Array<Omit<Applicant, 'id' | 'createdAt' | 'updatedAt'>> = [
                  {
                    companyId,
                    personalInfo: {
                      firstName: 'John',
                      lastName: 'Smith',
                      email: 'john.smith@example.com',
                      phone: '+1-555-0101',
                      nationality: 'United States',
                      dateOfBirth: '1985-03-15',
                    },
                    application: {
                      position: 'Chief Engineer',
                      experience: 8,
                      status: 'reviewing',
                      appliedDate: '2024-01-15',
                      priority: 'high',
                    },
                    qualifications: {
                      rank: 'Chief Engineer',
                      certificates: ['STCW III/1', 'Engine Room Resource Management'],
                      lastVessel: 'MV Atlantic Star',
                    },
                  },
                  {
                    companyId,
                    personalInfo: {
                      firstName: 'Maria',
                      lastName: 'Garcia',
                      email: 'maria.garcia@example.com',
                      phone: '+34-666-123456',
                      nationality: 'Spain',
                      dateOfBirth: '1990-07-22',
                    },
                    application: {
                      position: 'Second Officer',
                      experience: 4,
                      status: 'interview',
                      appliedDate: '2024-01-18',
                      priority: 'medium',
                    },
                    qualifications: {
                      rank: 'Second Officer',
                      certificates: ['STCW II/1', 'Bridge Resource Management'],
                      lastVessel: 'MV Mediterranean',
                    },
                  },
                ];
                for (const a of sample) {
                  await db.createApplicant(a);
                }
              }
            }
            localStorage.setItem(seededKey, '1');
          }
        } catch (seedErr) {
          console.warn('[Database] Applicant seed failed:', seedErr);
        }
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
