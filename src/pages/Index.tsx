import { Outlet } from 'react-router-dom';
import { Suspense, useEffect } from 'react';
import { useCompany } from '@/hooks/use-company';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/database2';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { AppLayout } from '@/components/layout/app-layout';
import { DatabaseProvider } from '@/context/DatabaseContext';
import { Company } from '@/lib/schemas';

/**
 * Index component that serves as a layout wrapper for all authenticated routes.
 * It includes the AppLayout and renders child routes using the Outlet component.
 */
const Index = () => {
  const { user } = useAuth();
  const { company, setCompany } = useCompany();

  // Load company data when user is authenticated
  useEffect(() => {
    const loadCompany = async () => {
      if (user?.companyId && !company) {
        try {
          const companyData = await db.getById<Company>('companies', user.companyId);
          if (companyData) {
            // Ensure we have all required Company properties with defaults
            const defaultSettings = {
              currency: 'USD',
              dateFormat: 'MM/dd/yyyy',
              timezone: 'UTC'
            };

            const companyWithDefaults: Company = {
              ...companyData,
              name: companyData.name || 'Unnamed Company',
              address: companyData.address || '',
              phone: companyData.phone || '',
              email: companyData.email || '',
              settings: companyData.settings ? 
                { ...defaultSettings, ...companyData.settings } : 
                defaultSettings,
              createdAt: companyData.createdAt || new Date().toISOString(),
              updatedAt: companyData.updatedAt || new Date().toISOString(),
              id: companyData.id || user.companyId,
            };
            setCompany(companyWithDefaults);
          }
        } catch (error) {
          console.error('Failed to load company data:', error);
        }
      }
    };

    loadCompany();
  }, [user, company, setCompany]);

  // Show loading state while company data is being loaded
  if (user?.companyId && !company) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner className="h-12 w-12" />
          <p className="text-muted-foreground">Loading company data...</p>
        </div>
      </div>
    );
  }

  return (
    <DatabaseProvider>
      <AppLayout>
        <Suspense 
          fallback={
            <div className="flex h-full w-full items-center justify-center">
              <LoadingSpinner className="h-12 w-12" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </AppLayout>
    </DatabaseProvider>
  );
};

export default Index;
