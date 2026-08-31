import { useEffect, useState } from 'react';
import { DashboardStats, QuickActions, RecentActivity, type RecentActivityItem } from '@/components/dashboard/DashboardStats';
import { FleetOverview } from '@/components/dashboard/FleetOverview';
import { useCompany } from '@/context/CompanyContext';
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
  activities: RecentActivityItem[];
}

function timeAgo(iso: string): string {
  const elapsed = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(elapsed)) return 'recently';
  const minutes = Math.floor(elapsed / 60000);
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? 'day' : 'days'} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function Dashboard() {
  const { selectedCompany, isLoading: companyLoading } = useCompany();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    seafarers: { total: 0, active: 0, onboard: 0, available: 0 },
    vessels: { total: 0, fullyManned: 0, needCrew: 0 },
    payroll: { monthlyTotal: 0, recordsCount: 0 },
    activities: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeDatabase = async () => {
      if (!selectedCompany) return;
      try {
        await db.init();
        const stats = await computeStats(selectedCompany.id);
        setDashboardData(stats);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDatabase();
  }, [selectedCompany]);

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

    // Build recent activity from real records only.
    const activityEntries: Array<{ timestamp: string; item: RecentActivityItem }> = [];
    vessels.forEach((vessel) => {
      const timestamp = vessel.updatedAt || vessel.createdAt;
      activityEntries.push({
        timestamp,
        item: {
          action: vessel.updatedAt ? 'Vessel Updated' : 'Vessel Registered',
          details: vessel.name,
          time: timeAgo(timestamp),
          type: 'info',
        },
      });
    });
    seafarers.forEach((s) => {
      const timestamp = s.updatedAt || s.createdAt;
      activityEntries.push({
        timestamp,
        item: {
          action: s.updatedAt ? 'Seafarer Updated' : 'New Seafarer Registered',
          details: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`.trim(),
          time: timeAgo(timestamp),
          type: 'info',
        },
      });
    });
    payrollRecords.forEach((record) => {
      const timestamp = record.updatedAt || record.createdAt;
      activityEntries.push({
        timestamp,
        item: {
          action: 'Payroll Processed',
          details: `${record.seafarerName} - ${record.currency || ''} ${record.netSalary || 0}`.trim(),
          time: timeAgo(timestamp),
          type: 'success',
        },
      });
    });
    activityEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      seafarers: { total, active, onboard, available },
      vessels: { total: vessels.length, fullyManned, needCrew },
      payroll: { monthlyTotal, recordsCount: monthlyRecords.length },
      activities: activityEntries.slice(0, 6).map((entry) => entry.item),
    };
  };

  if (companyLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!selectedCompany) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">No company yet</h2>
          <p className="text-sm text-muted-foreground">
            Create your first company to start managing seafarers, vessels, and payroll.
          </p>
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
          <RecentActivity activities={dashboardData.activities} />
        </div>
      </div>
    </div>
  );
}