import { Outlet } from 'react-router-dom';
import { Suspense } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/app-layout';

/**
 * Index component that serves as a layout wrapper for all authenticated routes.
 * It includes the AppLayout and renders child routes using the Outlet component.
 */
const Index = () => {
  const { user } = useAuth();
  const { selectedCompany: company, isLoading: companyLoading } = useCompany();

  // Show the branded loader while company data is being resolved. A user who is
  // not assigned to a company yet should not be blocked forever, so only wait
  // while the initial request is actually in flight.
  if (companyLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow">
            OS
          </div>
          <h1 className="text-xl font-bold">Ocean Stride</h1>
        </div>
      </div>
    );
  }

  if (user?.companyId && !company) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow">
            OS
          </div>
          <h1 className="text-xl font-bold">Ocean Stride</h1>
          <p className="text-sm text-muted-foreground">No company assigned yet.</p>
        </div>
      </div>
    );
  }

  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground shadow">
                OS
              </div>
              <h1 className="text-xl font-bold">Ocean Stride</h1>
            </div>
          </div>
        }
      >
        <Outlet />
      </Suspense>
    </AppLayout>
  );
};

export default Index;
