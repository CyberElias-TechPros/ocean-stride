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
        
        // Check if we have sample data, if not create some
        const stats = await db.getDashboardStats();
        
        if (stats.seafarers.total === 0) {
          // Create sample data
          await createSampleData();
          const newStats = await db.getDashboardStats();
          setDashboardData(newStats);
        } else {
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

  const createSampleData = async () => {
    // Get the first company to associate sample data with
    const companies = await db.getAllCompanies();
    const companyId = companies[0]?.id || 'default';
    
    // Sample seafarers
    const seafarers = [
      {
        companyId,
        personalInfo: {
          firstName: 'John',
          lastName: 'Smith',
          email: 'john.smith@email.com',
          phone: '+1-555-0123',
          nationality: 'USA',
          dateOfBirth: '1985-03-15',
          passportNumber: 'P1234567',
          seamanBook: 'SB001234',
        },
        qualifications: {
          rank: 'Captain',
          certificates: [],
        },
        employment: {
          status: 'onboard' as const,
          currentVessel: 'MV Ocean Pride',
          signOnDate: '2024-01-15',
          contractEnd: '2024-07-15',
        },
        financial: {
          basicWage: 8500,
          currency: 'USD',
          allotments: [],
        },
      },
      {
        companyId,
        personalInfo: {
          firstName: 'Maria',
          lastName: 'Garcia',
          email: 'maria.garcia@email.com',
          phone: '+34-555-0124',
          nationality: 'Spain',
          dateOfBirth: '1990-07-22',
          passportNumber: 'P2345678',
          seamanBook: 'SB002345',
        },
        qualifications: {
          rank: 'Chief Engineer',
          certificates: [],
        },
        employment: {
          status: 'available' as const,
        },
        financial: {
          basicWage: 7200,
          currency: 'USD',
          allotments: [],
        },
      },
      {
        companyId,
        personalInfo: {
          firstName: 'Chen',
          lastName: 'Wei',
          email: 'chen.wei@email.com',
          phone: '+86-555-0125',
          nationality: 'China',
          dateOfBirth: '1988-11-08',
          passportNumber: 'P3456789',
          seamanBook: 'SB003456',
        },
        qualifications: {
          rank: 'Second Officer',
          certificates: [],
        },
        employment: {
          status: 'active' as const,
          currentVessel: 'MV Baltic Star',
          signOnDate: '2024-02-01',
          contractEnd: '2024-08-01',
        },
        financial: {
          basicWage: 5800,
          currency: 'USD',
          allotments: [],
        },
      },
    ];

    // Sample vessels
    const vessels = [
      {
        companyId,
        name: 'MV Ocean Pride',
        type: 'Container Ship',
        flag: 'Liberia',
        imo: 'IMO1234567',
        crew: [
          { seafarerId: '1', rank: 'Captain', joinDate: '2024-01-15' },
        ],
      },
      {
        companyId,
        name: 'MV Baltic Star',
        type: 'Bulk Carrier',
        flag: 'Marshall Islands',
        imo: 'IMO2345678',
        crew: [
          { seafarerId: '3', rank: 'Second Officer', joinDate: '2024-02-01' },
        ],
      },
    ];

    // Create sample data
    for (const seafarer of seafarers) {
      await db.createSeafarer(seafarer);
    }

    for (const vessel of vessels) {
      await db.createVessel(vessel);
    }

    // Sample payroll records
    await db.createPayrollRecord({
      companyId,
      seafarerId: '1',
      period: {
        start: '2024-03-01',
        end: '2024-03-31',
      },
      earnings: {
        basicWage: 8500,
        overtime: 1200,
        allowances: 800,
        bonuses: 500,
      },
      deductions: {
        taxes: 2100,
        insurance: 300,
        allotments: 3000,
        other: 100,
      },
      netPay: 6500,
      currency: 'USD',
      status: 'processed',
    });
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