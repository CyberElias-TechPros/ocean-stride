import { useEffect, useState } from 'react';
import { DashboardStats, QuickActions, RecentActivity } from '@/components/dashboard/DashboardStats';
import { FleetOverview } from '@/components/dashboard/FleetOverview';
import { db } from '@/lib/database2';
import { INDEX_NAMES, type Seafarer, type Vessel, type Payroll } from '@/lib/schemas';

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
        const companiesAfter = await db.getAll('companies');
        const companyId = (companiesAfter as any[])[0]?.id as string | undefined;
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
    const seafarers = (await db.getSeafarersByCompany(companyId)) as Seafarer[];
    const vessels = (await db.getVesselsByCompany(companyId)) as Vessel[];

    const total = seafarers.length;
    const active = seafarers.filter(s => s.employment.employmentStatus === 'active').length;
    const onboard = seafarers.filter(s => s.employment.status === 'onboard').length;
    const available = seafarers.filter(s => s.employment.status === 'on_leave').length;

    // Vessel manning: consider vessels with at least one seafarer whose currentVesselId matches
    const vesselCrewMap = new Map<string, number>();
    seafarers.forEach(s => {
      const vid = s.employment.currentVesselId;
      if (vid) vesselCrewMap.set(vid, (vesselCrewMap.get(vid) || 0) + 1);
    });
    const fullyManned = vessels.filter(v => (vesselCrewMap.get(v.id) || 0) > 0).length;
    const needCrew = Math.max(0, vessels.length - fullyManned);

    // Payroll: aggregate by seafarers for current month
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const seafarerIds = seafarers.map(s => s.id);
    const payrollRecords: Payroll[] = (
      await Promise.all(
        seafarerIds.map(id => db.getByIndex<Payroll>('payrolls', INDEX_NAMES.PAYROLL_BY_SEAFARER, id))
      )
    ).flat();

    const monthlyRecords = payrollRecords.filter(r => {
      const d = new Date(r.periodStart);
      return d.getMonth() === month && d.getFullYear() === year;
    });
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