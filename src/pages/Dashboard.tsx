import { useEffect, useState } from 'react';
import { DashboardStats, QuickActions, RecentActivity } from '@/components/dashboard/DashboardStats';
import { FleetOverview } from '@/components/dashboard/FleetOverview';
import { db } from '@/lib/database';

interface DashboardData {
  seafarers: {
    total: number;
    active: number;
    onboard: number;
    available: number;
  };
  vessels: {
    total: number;
    fullyManned: number;
    needCrew: number;
  };
  payroll: {
    monthlyTotal: number;
    recordsCount: number;
  };
}

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    seafarers: { total: 0, active: 0, onboard: 0, available: 0 },
    vessels: { total: 0, fullyManned: 0, needCrew: 0 },
    payroll: { monthlyTotal: 0, recordsCount: 0 },
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        await db.init();
        const companies = (await db.getAll('companies')) as any[];
        if (!companies.length) {
          await db.generateSampleData();
        }
        const companiesAfter = (await db.getAll('companies')) as any[];
        const companyId = companiesAfter[0]?.id;
        if (companyId) {
          const stats = await computeStats(companyId);
          setDashboardData(stats);
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDatabase();
  }, []);

  const computeStats = async (companyId: string): Promise<DashboardData> => {
    const seafarers = await db.getSeafarersByCompany(companyId);
    const vessels = await db.getVesselsByCompany(companyId);
    const payroll = await db.getPayrollByCompany(companyId);

    const total = seafarers.length;
    const active = seafarers.filter(s => s.employment.status === 'active').length;
    const available = seafarers.filter(s => s.employment.status === 'available').length;
    const onboard = seafarers.filter(s => s.employment.currentVessel).length;

    const fullyManned = vessels.filter(v => seafarers.some(s => s.employment.currentVessel === v.name)).length;
    const needCrew = vessels.length - fullyManned;

    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyRecords = payroll.filter(p => p.period.start.startsWith(ym));
    const monthlyTotal = monthlyRecords.reduce((sum, p) => sum + (p.netSalary || 0), 0);

    return {
      seafarers: { total, active, onboard, available },
      vessels: { total: vessels.length, fullyManned, needCrew },
      payroll: { monthlyTotal, recordsCount: monthlyRecords.length },
    };
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your seafarer management operations
        </p>
      </div>

      {/* Stats Cards */}
      <DashboardStats data={dashboardData} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Fleet Overview */}
        <div className="lg:col-span-2">
          <FleetOverview />
        </div>

        {/* Right Column - Quick Actions & Activity */}
        <div className="space-y-6">
          <QuickActions />
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}