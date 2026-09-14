import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, PieChart, TrendingUp, Users, DollarSign, Ship } from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ChartData {
  name: string;
  value: number;
  percentage?: number;
  trend?: string;
  color?: string;
}

interface AnalyticsChartsProps {
  crewData?: ChartData[];
  costData?: ChartData[];
  performanceData?: ChartData[];
}

export function AnalyticsCharts({ 
  crewData = [], 
  costData = [], 
  performanceData = [] 
}: AnalyticsChartsProps) {
  
  const defaultCrewData = [
    { name: 'Officers', value: 45, percentage: 28, color: 'bg-primary' },
    { name: 'Engineers', value: 52, percentage: 32, color: 'bg-success' },
    { name: 'Ratings', value: 48, percentage: 30, color: 'bg-warning' },
    { name: 'Catering', value: 16, percentage: 10, color: 'bg-accent' }
  ];

  const defaultCostData = [
    { name: 'Wages & Salaries', value: 485000, percentage: 65, color: 'bg-primary' },
    { name: 'Travel & Repatriation', value: 78000, percentage: 10, color: 'bg-success' },
    { name: 'Training & Certification', value: 52000, percentage: 7, color: 'bg-warning' },
    { name: 'Insurance & Benefits', value: 89000, percentage: 12, color: 'bg-accent' },
    { name: 'Recruitment', value: 45000, percentage: 6, color: 'bg-secondary' }
  ];

  const defaultPerformanceData = [
    { name: 'Fleet Utilization', value: 87, trend: '+5%', color: 'text-success' },
    { name: 'Crew Retention', value: 94, trend: '+12%', color: 'text-success' },
    { name: 'Compliance Score', value: 96, trend: '-1%', color: 'text-warning' },
    { name: 'Training ROI', value: 340, trend: '+45%', color: 'text-success' }
  ];

  const crewChartData = crewData.length > 0 ? crewData : defaultCrewData;
  const costChartData = costData.length > 0 ? costData : defaultCostData;
  const performanceChartData = performanceData.length > 0 ? performanceData : defaultPerformanceData;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Crew Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Crew Distribution by Rank
          </CardTitle>
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
                data={crewChartData}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percentage }) => `${name} ${percentage}%`}
              >
                {crewChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${index + 1}))`} />
                ))}
              </Pie>
            </RechartsPieChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Cost Breakdown Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Cost Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              wages: { label: "Wages & Salaries", color: "hsl(var(--chart-1))" },
              travel: { label: "Travel & Repatriation", color: "hsl(var(--chart-2))" },
              training: { label: "Training & Certification", color: "hsl(var(--chart-3))" },
              insurance: { label: "Insurance & Benefits", color: "hsl(var(--chart-4))" },
              recruitment: { label: "Recruitment", color: "hsl(var(--chart-5))" },
            }}
            className="h-[300px]"
          >
            <BarChart data={costChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={{
              utilization: { label: "Fleet Utilization", color: "hsl(var(--chart-1))" },
              retention: { label: "Crew Retention", color: "hsl(var(--chart-2))" },
              compliance: { label: "Compliance Score", color: "hsl(var(--chart-3))" },
              roi: { label: "Training ROI", color: "hsl(var(--chart-4))" },
            }}
            className="h-[300px]"
          >
            <BarChart data={performanceChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="value" fill="hsl(var(--chart-1))" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Fleet Overview Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            Fleet Status Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-success/10 rounded-lg">
                <div className="text-2xl font-bold text-success">87%</div>
                <div className="text-sm text-muted-foreground">Fleet Utilization</div>
              </div>
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <div className="text-2xl font-bold text-warning">23</div>
                <div className="text-sm text-muted-foreground">Crew Changes Due</div>
              </div>
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <div className="text-2xl font-bold text-primary">158</div>
                <div className="text-sm text-muted-foreground">Active Crew</div>
              </div>
              <div className="text-center p-4 bg-accent/10 rounded-lg">
                <div className="text-2xl font-bold text-accent">12</div>
                <div className="text-sm text-muted-foreground">Vessels in Fleet</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}