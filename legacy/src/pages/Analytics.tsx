import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Seafarer, Vessel, Payroll } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';
import {
  TrendingUp,
  TrendingDown,
  PieChart,
  AlertTriangle,
  Calendar,
  Download,
  Brain,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { exportToCSV } from '@/lib/utils/exportUtils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, FunnelChart, Funnel, LabelList } from 'recharts';

interface KPI {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'stable';
  target?: string;
}

interface PredictiveInsight {
  id: string;
  type: 'risk' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  timeframe: string;
}

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('last-month');
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictiveInsights, setPredictiveInsights] = useState<PredictiveInsight[]>([]);
  const [crewRankData, setCrewRankData] = useState<any[]>([]);
  const [crewStatusData, setCrewStatusData] = useState<any[]>([]);
  const [crewNationalityData, setCrewNationalityData] = useState<any[]>([]);
  const [payrollTimeData, setPayrollTimeData] = useState<any[]>([]);
  const [costDepartmentData, setCostDepartmentData] = useState<any[]>([]);
  const [currencyData, setCurrencyData] = useState<any[]>([]);
  const [certificateExpiryData, setCertificateExpiryData] = useState<any[]>([]);
  const [recruitmentPipelineData, setRecruitmentPipelineData] = useState<any[]>([]);
  const [performanceTrendsData, setPerformanceTrendsData] = useState<any[]>([]);
  const [selectedInsight, setSelectedInsight] = useState<PredictiveInsight | null>(null);
  const [showInsightDetails, setShowInsightDetails] = useState(false);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    const loadAnalyticsData = async () => {
      if (!selectedCompany) return;

      try {
        await db.init();

        // Load all data in parallel
        const [seafarers, vessels, payrolls] = await Promise.all([
          db.getSeafarersByCompany(selectedCompany.id),
          db.getVesselsByCompany(selectedCompany.id),
          db.getAll<Payroll>('payrolls')
        ]);

        // Calculate KPIs
        const calculatedKpis: KPI[] = [
          {
            title: 'Fleet Utilization',
            value: `${Math.round((seafarers.filter(s => s.employment.status === 'onboard').length / seafarers.length) * 100)}%`,
            change: '+5%',
            trend: 'up',
            target: '90%'
          },
          {
            title: 'Crew Retention Rate',
            value: `${Math.round((seafarers.filter(s => s.employment.employmentStatus === 'active').length / seafarers.length) * 100)}%`,
            change: '+12%',
            trend: 'up',
            target: '95%'
          },
          {
            title: 'Average Contract Length',
            value: `${(seafarers.reduce((sum, s) => {
              const start = new Date(s.employment.joinedDate);
              const end = s.employment.contractEndDate ? new Date(s.employment.contractEndDate) : new Date();
              return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30);
            }, 0) / seafarers.length).toFixed(1)} months`,
            change: '+0.8',
            trend: 'up'
          },
          {
            title: 'Compliance Score',
            value: `${Math.round((seafarers.filter(s => s.documents.length > 0 && s.trainings.length > 0).length / seafarers.length) * 100)}%`,
            change: '-1%',
            trend: 'down',
            target: '98%'
          },
          {
            title: 'Total Payroll',
            value: `$${payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0).toLocaleString()}`,
            change: '+8%',
            trend: 'up'
          },
          {
            title: 'Active Seafarers',
            value: seafarers.filter(s => s.employment.status === 'onboard').length.toString(),
            change: '+2',
            trend: 'up'
          }
        ];

        // Calculate predictive insights
        const expiringDocuments = seafarers.filter(s => {
          const hasExpiringDoc = s.documents.some(d => d.expiryDate && new Date(d.expiryDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
          const hasExpiringTraining = s.trainings.some(t => t.expiryDate && new Date(t.expiryDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
          const hasExpiringMedical = s.medicals.some(m => m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 60 * 24 * 60 * 60 * 1000));
          return hasExpiringDoc || hasExpiringTraining || hasExpiringMedical;
        }).length;

        const insights: PredictiveInsight[] = [
          {
            id: '1',
            type: 'risk',
            title: 'Certificate Expiry Risk',
            description: `${expiringDocuments} seafarers have certificates expiring in the next 60 days`,
            confidence: 92,
            impact: 'high',
            timeframe: 'Next 60 days'
          },
          {
            id: '2',
            type: 'opportunity',
            title: 'Crew Rotation Optimization',
            description: `Optimize rotation schedules to reduce costs by $${Math.round(payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0) * 0.05)} annually`,
            confidence: 78,
            impact: 'medium',
            timeframe: 'Next quarter'
          },
          {
            id: '3',
            type: 'recommendation',
            title: 'Training Investment',
            description: 'Invest in advanced training to improve compliance scores',
            confidence: 85,
            impact: 'high',
            timeframe: 'Next 6 months'
          }
        ];

        setKpis(calculatedKpis);
        setPredictiveInsights(insights);

        // Compute chart data
        // Crew Rank Distribution
        const rankCounts = seafarers.reduce((acc, s) => {
          const rank = s.employment.rank;
          acc[rank] = (acc[rank] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const totalSeafarers = seafarers.length;
        const crewRankData = Object.entries(rankCounts).map(([rank, count]) => ({
          name: rank,
          value: count,
          percentage: Math.round((count / totalSeafarers) * 100)
        }));
        setCrewRankData(crewRankData);

        // Crew Status Distribution
        const statusCounts = seafarers.reduce((acc, s) => {
          const status = s.employment.status;
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const crewStatusData = Object.entries(statusCounts).map(([status, count]) => ({
          name: status.charAt(0).toUpperCase() + status.slice(1),
          value: count
        }));
        setCrewStatusData(crewStatusData);

        // Crew Nationality Distribution
        const nationalityCounts = seafarers.reduce((acc, s) => {
          const nationality = s.personalInfo.nationality;
          acc[nationality] = (acc[nationality] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const crewNationalityData = Object.entries(nationalityCounts).map(([nationality, count]) => ({
          name: nationality,
          value: count,
          percentage: Math.round((count / totalSeafarers) * 100)
        }));
        setCrewNationalityData(crewNationalityData);

        // Payroll over time (mock data since no historical)
        const payrollTimeData = [
          { month: 'Jan', amount: 45000 },
          { month: 'Feb', amount: 52000 },
          { month: 'Mar', amount: 48000 },
          { month: 'Apr', amount: 55000 },
          { month: 'May', amount: 47000 },
          { month: 'Jun', amount: 53000 }
        ];
        setPayrollTimeData(payrollTimeData);

        // Cost per department
        const departmentCosts = seafarers.reduce((acc, s) => {
          const dept = s.employment.department;
          acc[dept] = (acc[dept] || 0) + s.employment.baseWage;
          return acc;
        }, {} as Record<string, number>);
        const costDepartmentData = Object.entries(departmentCosts).map(([dept, cost]) => ({
          department: dept.charAt(0).toUpperCase() + dept.slice(1),
          cost: cost
        }));
        setCostDepartmentData(costDepartmentData);

        // Currency distribution
        const currencyCounts = payrolls.reduce((acc, p) => {
          const currency = p.currency;
          acc[currency] = (acc[currency] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        const currencyData = Object.entries(currencyCounts).map(([currency, count]) => ({
          name: currency,
          value: count,
          percentage: Math.round((count / payrolls.length) * 100)
        }));
        setCurrencyData(currencyData);

        // Certificate expiry timeline (mock)
        const certificateExpiryData = [
          { month: 'Jul', expiring: 5 },
          { month: 'Aug', expiring: 8 },
          { month: 'Sep', expiring: 12 },
          { month: 'Oct', expiring: 6 },
          { month: 'Nov', expiring: 9 },
          { month: 'Dec', expiring: 4 }
        ];
        setCertificateExpiryData(certificateExpiryData);

        // Recruitment pipeline (mock)
        const recruitmentPipelineData = [
          { stage: 'Applied', count: 150 },
          { stage: 'Screening', count: 80 },
          { stage: 'Interview', count: 40 },
          { stage: 'Offer', count: 15 },
          { stage: 'Hired', count: 8 }
        ];
        setRecruitmentPipelineData(recruitmentPipelineData);

        // Performance trends (mock)
        const performanceTrendsData = [
          { month: 'Jan', utilization: 82, retention: 91, compliance: 94 },
          { month: 'Feb', utilization: 85, retention: 92, compliance: 95 },
          { month: 'Mar', utilization: 87, retention: 93, compliance: 96 },
          { month: 'Apr', utilization: 89, retention: 94, compliance: 95 },
          { month: 'May', utilization: 86, retention: 93, compliance: 97 },
          { month: 'Jun', utilization: 88, retention: 95, compliance: 96 }
        ];
        setPerformanceTrendsData(performanceTrendsData);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
        toast({
          title: "Error",
          description: "Failed to load analytics data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadAnalyticsData();
  }, [selectedCompany, toast]);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-success';
      case 'down': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertTriangle className="w-5 h-5 text-destructive" />;
      case 'opportunity': return <Target className="w-5 h-5 text-success" />;
      case 'recommendation': return <Brain className="w-5 h-5 text-info" />;
      default: return <Activity className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const exportReport = () => {
    const reportContent = `
ANALYTICS REPORT
================

Generated on: ${new Date().toLocaleString()}

KEY PERFORMANCE INDICATORS:
---------------------------
${kpis.map(kpi => `${kpi.title}: ${kpi.value} (${kpi.change})`).join('\n')}

PREDICTIVE INSIGHTS:
--------------------
${predictiveInsights.map(insight =>
  `${insight.title}: ${insight.description} (Confidence: ${insight.confidence}%, Impact: ${insight.impact})`
).join('\n')}

This report contains real-time analytics based on current system data.
    `.trim();

    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `analytics_report_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Report Exported",
      description: "Analytics report has been downloaded"
    });
  };

  const handleViewInsightDetails = (insight: PredictiveInsight) => {
    setSelectedInsight(insight);
    setShowInsightDetails(true);
  };

  const handleImplementRecommendation = (insight: PredictiveInsight) => {
    // Simulate implementing the recommendation
    toast({
      title: "Recommendation Implemented",
      description: `Action taken for: ${insight.title}`,
    });
    setShowInsightDetails(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Insights</h1>
          <p className="text-muted-foreground">Data-driven insights and predictive analytics for crew management</p>
        </div>
        
        <div className="flex gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
              <SelectItem value="last-quarter">Last Quarter</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              {getTrendIcon(kpi.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-xs ${getTrendColor(kpi.trend)}`}>
                  {kpi.change} from last period
                </span>
                {kpi.target && (
                  <Badge variant="outline" className="text-xs">
                    Target: {kpi.target}
                  </Badge>
                )}
              </div>
              {kpi.target && (
                <Progress 
                  value={parseInt(kpi.value)} 
                  className="mt-2" 
                />
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Analytics */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="crew">Crew Analytics</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="predictive">Predictive AI</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <AnalyticsCharts />
        </TabsContent>

        <TabsContent value="crew" className="space-y-6">
          {/* Crew Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Seafarer Distribution by Rank</CardTitle>
                <CardDescription>Breakdown of crew by rank categories</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    officers: { label: "Officers", color: "hsl(var(--chart-1))" },
                    engineers: { label: "Engineers", color: "hsl(var(--chart-2))" },
                    ratings: { label: "Ratings", color: "hsl(var(--chart-3))" },
                    catering: { label: "Catering", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-[300px]"
                >
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={crewRankData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                    >
                      {crewRankData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Seafarer Status Distribution</CardTitle>
                <CardDescription>Current employment status breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    onboard: { label: "Onboard", color: "hsl(var(--chart-1))" },
                    on_leave: { label: "On Leave", color: "hsl(var(--chart-2))" },
                    on_training: { label: "On Training", color: "hsl(var(--chart-3))" },
                    inactive: { label: "Inactive", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={crewStatusData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crew Nationality Distribution</CardTitle>
                <CardDescription>Nationality breakdown of seafarers</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    philippines: { label: "Philippines", color: "hsl(var(--chart-1))" },
                    indonesia: { label: "Indonesia", color: "hsl(var(--chart-2))" },
                    india: { label: "India", color: "hsl(var(--chart-3))" },
                    china: { label: "China", color: "hsl(var(--chart-4))" },
                    others: { label: "Others", color: "hsl(var(--chart-5))" },
                  }}
                  className="h-[300px]"
                >
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={crewNationalityData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                    >
                      {crewNationalityData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Crew Performance Metrics</CardTitle>
                <CardDescription>Individual and team performance indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { metric: 'Average Performance Score', value: '4.2/5', trend: 'up' },
                    { metric: 'Contract Completion Rate', value: '94%', trend: 'up' },
                    { metric: 'Training Compliance', value: '89%', trend: 'down' },
                    { metric: 'Safety Incidents', value: '0.3/month', trend: 'up' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <div className="font-medium">{item.metric}</div>
                        <div className="text-2xl font-bold">{item.value}</div>
                      </div>
                      {getTrendIcon(item.trend)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Crew Satisfaction</CardTitle>
                <CardDescription>Feedback and satisfaction scores</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-success">8.4</div>
                    <div className="text-sm text-muted-foreground">Overall Satisfaction Score</div>
                  </div>
                  <div className="space-y-3">
                    {[
                      { category: 'Work Environment', score: 8.6 },
                      { category: 'Management', score: 8.2 },
                      { category: 'Compensation', score: 8.0 },
                      { category: 'Career Development', score: 8.8 }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{item.category}</span>
                        <div className="flex items-center gap-2">
                          <Progress value={item.score * 10} className="w-20" />
                          <span className="text-sm font-medium w-8">{item.score}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {/* Financial Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Payroll Expenses Over Time</CardTitle>
                <CardDescription>Monthly payroll expenditure trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    amount: { label: "Amount", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <LineChart data={payrollTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="amount" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost per Department</CardTitle>
                <CardDescription>Salary distribution by department</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    cost: { label: "Cost", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <BarChart data={costDepartmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="department" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="cost" fill="hsl(var(--chart-1))" />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Currency Distribution</CardTitle>
                <CardDescription>Payroll currency breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    usd: { label: "USD", color: "hsl(var(--chart-1))" },
                    eur: { label: "EUR", color: "hsl(var(--chart-2))" },
                    gbp: { label: "GBP", color: "hsl(var(--chart-3))" },
                    others: { label: "Others", color: "hsl(var(--chart-4))" },
                  }}
                  className="h-[300px]"
                >
                  <RechartsPieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                      data={currencyData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percentage }) => `${name} ${percentage}%`}
                    >
                      {currencyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                      ))}
                    </Pie>
                  </RechartsPieChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Financial Performance</CardTitle>
                <CardDescription>Revenue and cost analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  <PieChart className="w-8 h-8 mr-2" />
                  Financial performance charts would be displayed here
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cost Optimization Opportunities</CardTitle>
                <CardDescription>Identified areas for cost reduction</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { opportunity: 'Optimize crew rotation schedules', savings: '$45,000/year', impact: 'Medium' },
                    { opportunity: 'Bulk training program discounts', savings: '$18,000/year', impact: 'Low' },
                    { opportunity: 'Improve recruitment efficiency', savings: '$32,000/year', impact: 'High' },
                    { opportunity: 'Reduce travel costs', savings: '$28,000/year', impact: 'Medium' }
                  ].map((item, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{item.opportunity}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              Potential savings: {item.savings}
                            </div>
                          </div>
                          <Badge
                            variant={item.impact === 'High' ? 'default' : 'outline'}
                            className={item.impact === 'High' ? 'bg-success/20 text-success-foreground' : ''}
                          >
                            {item.impact} Impact
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictive" className="space-y-6">
          {/* Predictive Analytics Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Certificate Expiry Timeline</CardTitle>
                <CardDescription>Projected certificate expirations</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    expiring: { label: "Expiring", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <LineChart data={certificateExpiryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="expiring" stroke="hsl(var(--chart-1))" strokeWidth={2} />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recruitment Pipeline Funnel</CardTitle>
                <CardDescription>Candidate progression through hiring stages</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    count: { label: "Count", color: "hsl(var(--chart-1))" },
                  }}
                  className="h-[300px]"
                >
                  <FunnelChart data={recruitmentPipelineData}>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Funnel
                      dataKey="count"
                      data={recruitmentPipelineData}
                      isAnimationActive
                    >
                      <LabelList position="center" fill="#fff" stroke="none" />
                    </Funnel>
                  </FunnelChart>
                </ChartContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>Key metrics over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer
                  config={{
                    utilization: { label: "Utilization", color: "hsl(var(--chart-1))" },
                    retention: { label: "Retention", color: "hsl(var(--chart-2))" },
                    compliance: { label: "Compliance", color: "hsl(var(--chart-3))" },
                  }}
                  className="h-[300px]"
                >
                  <AreaChart data={performanceTrendsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="utilization" stackId="1" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" />
                    <Area type="monotone" dataKey="retention" stackId="1" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" />
                    <Area type="monotone" dataKey="compliance" stackId="1" stroke="hsl(var(--chart-3))" fill="hsl(var(--chart-3))" />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-6 h-6" />
                AI-Powered Predictive Insights
              </CardTitle>
              <CardDescription>
                Machine learning insights and recommendations based on historical data and patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {predictiveInsights.map((insight) => (
                  <Card key={insight.id} className="border-l-4 border-l-primary">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          {getInsightIcon(insight.type)}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium">{insight.title}</h4>
                            <Badge
                              variant={insight.type === 'risk' ? 'destructive' : insight.type === 'opportunity' ? 'default' : 'secondary'}
                              className={insight.type === 'opportunity' ? 'bg-success/20 text-success-foreground' : ''}
                            >
                              {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                            </Badge>
                          </div>

                          <p className="text-sm text-muted-foreground mb-3">
                            {insight.description}
                          </p>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              Confidence: {insight.confidence}%
                            </div>
                            <div className={`flex items-center gap-1 ${getImpactColor(insight.impact)}`}>
                              <Target className="w-3 h-3" />
                              {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {insight.timeframe}
                            </div>
                          </div>

                          <div className="mt-3">
                            <Progress value={insight.confidence} className="h-1" />
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewInsightDetails(insight)}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Risk Prediction Model</CardTitle>
                <CardDescription>AI-powered risk assessment and early warning system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-destructive/10 rounded-lg">
                    <div>
                      <div className="font-medium text-destructive">High Risk</div>
                      <div className="text-sm text-muted-foreground">Certificate Expiry</div>
                    </div>
                    <div className="text-2xl font-bold text-destructive">15</div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-warning/10 rounded-lg">
                    <div>
                      <div className="font-medium text-warning">Medium Risk</div>
                      <div className="text-sm text-muted-foreground">Crew Fatigue</div>
                    </div>
                    <div className="text-2xl font-bold text-warning">8</div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-success/10 rounded-lg">
                    <div>
                      <div className="font-medium text-success">Low Risk</div>
                      <div className="text-sm text-muted-foreground">Overall Fleet</div>
                    </div>
                    <div className="text-2xl font-bold text-success">92%</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performance Forecasting</CardTitle>
                <CardDescription>Predicted trends for next quarter</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { metric: 'Crew Utilization', current: '87%', predicted: '91%', trend: 'up' },
                    { metric: 'Training Completion', current: '89%', predicted: '94%', trend: 'up' },
                    { metric: 'Compliance Score', current: '96%', predicted: '94%', trend: 'down' },
                    { metric: 'Retention Rate', current: '94%', predicted: '96%', trend: 'up' }
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                      <div>
                        <div className="font-medium">{item.metric}</div>
                        <div className="text-sm text-muted-foreground">
                          Current: {item.current} → Forecast: {item.predicted}
                        </div>
                      </div>
                      {getTrendIcon(item.trend)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Insight Details Dialog */}
      {selectedInsight && (
        <Dialog open={showInsightDetails} onOpenChange={setShowInsightDetails}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getInsightIcon(selectedInsight.type)}
                {selectedInsight.title}
              </DialogTitle>
              <DialogDescription>
                Detailed analysis and actionable recommendations
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Insight Overview */}
              <Card>
                <CardHeader>
                  <CardTitle>Insight Overview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Description</h4>
                      <p className="text-sm text-muted-foreground">{selectedInsight.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{selectedInsight.confidence}%</div>
                        <div className="text-sm text-muted-foreground">Confidence Level</div>
                        <Progress value={selectedInsight.confidence} className="mt-2" />
                      </div>
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getImpactColor(selectedInsight.impact)}`}>
                          {selectedInsight.impact.charAt(0).toUpperCase() + selectedInsight.impact.slice(1)}
                        </div>
                        <div className="text-sm text-muted-foreground">Impact Level</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-info">{selectedInsight.timeframe}</div>
                        <div className="text-sm text-muted-foreground">Timeframe</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Detailed Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>Detailed Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedInsight.type === 'risk' && (
                      <div>
                        <h4 className="font-medium mb-2">Risk Assessment</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Probability of occurrence:</span>
                            <span className="font-medium">{selectedInsight.confidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Potential impact:</span>
                            <span className={`font-medium ${getImpactColor(selectedInsight.impact)}`}>
                              {selectedInsight.impact.charAt(0).toUpperCase() + selectedInsight.impact.slice(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Time to impact:</span>
                            <span className="font-medium">{selectedInsight.timeframe}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedInsight.type === 'opportunity' && (
                      <div>
                        <h4 className="font-medium mb-2">Opportunity Analysis</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Success probability:</span>
                            <span className="font-medium">{selectedInsight.confidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Potential benefit:</span>
                            <span className={`font-medium ${getImpactColor(selectedInsight.impact)}`}>
                              {selectedInsight.impact.charAt(0).toUpperCase() + selectedInsight.impact.slice(1)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Implementation window:</span>
                            <span className="font-medium">{selectedInsight.timeframe}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedInsight.type === 'recommendation' && (
                      <div>
                        <h4 className="font-medium mb-2">Recommendation Details</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Implementation confidence:</span>
                            <span className="font-medium">{selectedInsight.confidence}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Expected outcome:</span>
                            <span className={`font-medium ${getImpactColor(selectedInsight.impact)}`}>
                              {selectedInsight.impact.charAt(0).toUpperCase() + selectedInsight.impact.slice(1)} Impact
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Recommended timeline:</span>
                            <span className="font-medium">{selectedInsight.timeframe}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Actionable Recommendations */}
              <Card>
                <CardHeader>
                  <CardTitle>Actionable Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {selectedInsight.type === 'risk' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-destructive/10 rounded-lg">
                          <h5 className="font-medium text-destructive mb-1">Immediate Actions Required</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Review and update certificates expiring soon</li>
                            <li>• Schedule renewal appointments</li>
                            <li>• Notify affected seafarers</li>
                            <li>• Update compliance documentation</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-warning/10 rounded-lg">
                          <h5 className="font-medium text-warning mb-1">Preventive Measures</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Implement automated renewal reminders</li>
                            <li>• Create certificate tracking dashboard</li>
                            <li>• Establish renewal buffer periods</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedInsight.type === 'opportunity' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-success/10 rounded-lg">
                          <h5 className="font-medium text-success mb-1">Optimization Opportunities</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Analyze current crew rotation patterns</li>
                            <li>• Identify overlapping assignments</li>
                            <li>• Optimize travel and accommodation costs</li>
                            <li>• Implement predictive scheduling</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-info/10 rounded-lg">
                          <h5 className="font-medium text-info mb-1">Implementation Steps</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Conduct cost-benefit analysis</li>
                            <li>• Develop new rotation schedules</li>
                            <li>• Train staff on new procedures</li>
                            <li>• Monitor and measure improvements</li>
                          </ul>
                        </div>
                      </div>
                    )}

                    {selectedInsight.type === 'recommendation' && (
                      <div className="space-y-3">
                        <div className="p-3 bg-primary/10 rounded-lg">
                          <h5 className="font-medium text-primary mb-1">Recommended Actions</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Assess current training programs</li>
                            <li>• Identify skill gaps</li>
                            <li>• Develop targeted training initiatives</li>
                            <li>• Partner with accredited training providers</li>
                          </ul>
                        </div>
                        <div className="p-3 bg-secondary/10 rounded-lg">
                          <h5 className="font-medium mb-1">Expected Benefits</h5>
                          <ul className="text-sm space-y-1">
                            <li>• Improved compliance scores</li>
                            <li>• Reduced regulatory violations</li>
                            <li>• Enhanced crew competency</li>
                            <li>• Better safety records</li>
                          </ul>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Implementation Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" className="flex-1" onClick={() => setShowInsightDetails(false)}>
                  Close
                </Button>
                <Button
                  className="flex-1 ocean-gradient"
                  onClick={() => handleImplementRecommendation(selectedInsight)}
                >
                  Implement Recommendation
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
