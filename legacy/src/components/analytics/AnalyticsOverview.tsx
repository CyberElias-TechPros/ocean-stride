import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Ship, DollarSign, Calendar, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import { formatCurrency } from '@/lib/table-utils';
import type { Seafarer, Vessel, Payroll, Document } from '@/lib/schemas';

interface AnalyticsData {
  seafarerMetrics: {
    total: number;
    onboard: number;
    onLeave: number;
    byRank: Array<{ rank: string; count: number }>;
    byNationality: Array<{ nationality: string; count: number }>;
  };
  vesselMetrics: {
    total: number;
    active: number;
    maintenance: number;
    utilization: Array<{ vessel: string; utilization: number }>;
  };
  payrollMetrics: {
    monthlyTotal: number;
    averageSalary: number;
    byMonth: Array<{ month: string; total: number }>;
    byRank: Array<{ rank: string; average: number }>;
  };
  complianceMetrics: {
    documentsExpiring: number;
    documentsExpired: number;
    certificatesValid: number;
    complianceRate: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function AnalyticsOverview() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('6months');
  const { selectedCompany } = useCompany();

  useEffect(() => {
    if (selectedCompany) {
      loadAnalyticsData();
    }
  }, [selectedCompany, timeframe]);

  const loadAnalyticsData = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      
      // Load all data
      const [seafarers, vessels, payrolls, documents] = await Promise.all([
        db.getSeafarersByCompany(selectedCompany.id),
        db.getVesselsByCompany(selectedCompany.id),
        db.getAll<Payroll>('payrolls'),
        db.getAll<Document>('documents'),
      ]);

      // Filter company-specific data
      const companyPayrolls = payrolls.filter(p => p.companyId === selectedCompany.id);
      const companyDocuments = documents.filter(d => d.companyId === selectedCompany.id);

      // Calculate seafarer metrics
      const seafarerMetrics = {
        total: seafarers.length,
        onboard: seafarers.filter(s => s.employment.status === 'onboard').length,
        onLeave: seafarers.filter(s => s.employment.status === 'on_leave').length,
        byRank: calculateByRank(seafarers),
        byNationality: calculateByNationality(seafarers),
      };

      // Calculate vessel metrics
      const vesselMetrics = {
        total: vessels.length,
        active: vessels.filter(v => v.status === 'active').length,
        maintenance: vessels.filter(v => v.status === 'maintenance').length,
        utilization: calculateVesselUtilization(vessels, seafarers),
      };

      // Calculate payroll metrics
      const payrollMetrics = {
        monthlyTotal: calculateMonthlyTotal(companyPayrolls),
        averageSalary: calculateAverageSalary(companyPayrolls),
        byMonth: calculatePayrollByMonth(companyPayrolls),
        byRank: calculatePayrollByRank(companyPayrolls, seafarers),
      };

      // Calculate compliance metrics
      const complianceMetrics = calculateComplianceMetrics(companyDocuments);

      setData({
        seafarerMetrics,
        vesselMetrics,
        payrollMetrics,
        complianceMetrics,
      });
    } catch (error) {
      console.error('Failed to load analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateByRank = (seafarers: Seafarer[]) => {
    const rankCounts = seafarers.reduce((acc, s) => {
      const rank = s.employment.rank || 'Unknown';
      acc[rank] = (acc[rank] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(rankCounts)
      .map(([rank, count]) => ({ rank, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  };

  const calculateByNationality = (seafarers: Seafarer[]) => {
    const nationalityCounts = seafarers.reduce((acc, s) => {
      const nationality = s.personalInfo.nationality || 'Unknown';
      acc[nationality] = (acc[nationality] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(nationalityCounts)
      .map(([nationality, count]) => ({ nationality, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  };

  const calculateVesselUtilization = (vessels: Vessel[], seafarers: Seafarer[]) => {
    return vessels.map(vessel => {
      const crewCount = seafarers.filter(s => s.employment.currentVesselId === vessel.id).length;
      // Assume typical crew size based on vessel type (simplified)
      const typicalCrewSize = vessel.type === 'Container Ship' ? 20 : 
                              vessel.type === 'Bulk Carrier' ? 18 :
                              vessel.type === 'Tanker' ? 22 : 16;
      const utilization = Math.round((crewCount / typicalCrewSize) * 100);
      
      return {
        vessel: vessel.name,
        utilization: Math.min(utilization, 100),
      };
    }).slice(0, 10);
  };

  const calculateMonthlyTotal = (payrolls: Payroll[]) => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return payrolls
      .filter(p => {
        const payrollDate = new Date(p.periodStart);
        return payrollDate.getMonth() === currentMonth && payrollDate.getFullYear() === currentYear;
      })
      .reduce((sum, p) => sum + (p.netSalary || 0), 0);
  };

  const calculateAverageSalary = (payrolls: Payroll[]) => {
    if (payrolls.length === 0) return 0;
    const total = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
    return total / payrolls.length;
  };

  const calculatePayrollByMonth = (payrolls: Payroll[]) => {
    const monthData = new Array(12).fill(0).map((_, i) => ({
      month: new Date(0, i).toLocaleString('default', { month: 'short' }),
      total: 0,
    }));

    payrolls.forEach(p => {
      const month = new Date(p.periodStart).getMonth();
      monthData[month].total += p.netSalary || 0;
    });

    return monthData;
  };

  const calculatePayrollByRank = (payrolls: Payroll[], seafarers: Seafarer[]) => {
    const rankPayrolls = payrolls.reduce((acc, p) => {
      const seafarer = seafarers.find(s => s.id === p.seafarerId);
      const rank = seafarer?.employment.rank || 'Unknown';
      
      if (!acc[rank]) {
        acc[rank] = { total: 0, count: 0 };
      }
      acc[rank].total += p.netSalary || 0;
      acc[rank].count += 1;
      
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    return Object.entries(rankPayrolls)
      .map(([rank, data]) => ({
        rank,
        average: Math.round(data.total / data.count),
      }))
      .sort((a, b) => b.average - a.average)
      .slice(0, 8);
  };

  const calculateComplianceMetrics = (documents: Document[]) => {
    const today = new Date();
    
    let documentsExpiring = 0;
    let documentsExpired = 0;
    let certificatesValid = 0;

    documents.forEach(doc => {
      if (doc.expiryDate) {
        const expiryDate = new Date(doc.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilExpiry < 0) {
          documentsExpired++;
        } else if (daysUntilExpiry <= 30) {
          documentsExpiring++;
        } else {
          certificatesValid++;
        }
      } else {
        certificatesValid++;
      }
    });

    const total = documentsExpiring + documentsExpired + certificatesValid;
    const complianceRate = total > 0 ? Math.round((certificatesValid / total) * 100) : 100;

    return {
      documentsExpiring,
      documentsExpired,
      certificatesValid,
      complianceRate,
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics Overview</h1>
          <p className="text-muted-foreground">Comprehensive insights into your maritime operations</p>
        </div>
        
        <Select value={timeframe} onValueChange={setTimeframe}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1month">Last Month</SelectItem>
            <SelectItem value="3months">Last 3 Months</SelectItem>
            <SelectItem value="6months">Last 6 Months</SelectItem>
            <SelectItem value="1year">Last Year</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Seafarers</p>
                <p className="text-3xl font-bold">{data.seafarerMetrics.total}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Vessels</p>
                <p className="text-3xl font-bold">{data.vesselMetrics.active}</p>
              </div>
              <Ship className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Monthly Payroll</p>
                <p className="text-3xl font-bold">{formatCurrency(data.payrollMetrics.monthlyTotal)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                <p className="text-3xl font-bold">{data.complianceMetrics.complianceRate}%</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="seafarers" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="seafarers">Seafarers</TabsTrigger>
          <TabsTrigger value="vessels">Vessels</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
        </TabsList>

        <TabsContent value="seafarers" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seafarers by Rank</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.seafarerMetrics.byRank}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rank" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seafarers by Nationality</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={data.seafarerMetrics.byNationality}
                      dataKey="count"
                      nameKey="nationality"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ nationality, count }) => `${nationality}: ${count}`}
                    >
                      {data.seafarerMetrics.byNationality.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="vessels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Vessel Crew Utilization</CardTitle>
              <CardDescription>Percentage of optimal crew capacity</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={data.vesselMetrics.utilization}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vessel" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
                  <Bar dataKey="utilization" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Payroll Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data.payrollMetrics.byMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Total']} />
                    <Line type="monotone" dataKey="total" stroke="#FFBB28" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Average Salary by Rank</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.payrollMetrics.byRank}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="rank" />
                    <YAxis />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Average']} />
                    <Bar dataKey="average" fill="#FF8042" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Valid Documents</p>
                <p className="text-3xl font-bold">{data.complianceMetrics.certificatesValid}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Clock className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-3xl font-bold">{data.complianceMetrics.documentsExpiring}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-3xl font-bold">{data.complianceMetrics.documentsExpired}</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}