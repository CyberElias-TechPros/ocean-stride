import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, PieChart, TrendingUp, Users, DollarSign, Ship } from 'lucide-react';

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
          <div className="space-y-4">
            {crewChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.value} seafarers</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={item.percentage || 0} className="w-24" />
                  <span className="text-sm font-medium w-8">{item.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
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
          <div className="space-y-4">
            {costChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${item.color}`} />
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-sm text-muted-foreground">{item.percentage}% of total</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${(item.value / 1000).toFixed(0)}K</div>
                  <Progress value={item.percentage || 0} className="w-20 mt-1" />
                </div>
              </div>
            ))}
          </div>
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
          <div className="space-y-4">
            {performanceChartData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-2xl font-bold">
                    {item.value}{item.name.includes('ROI') ? '%' : item.name.includes('Score') ? '%' : '%'}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={item.color}>
                    {item.trend}
                  </Badge>
                  <TrendingUp className="w-4 h-4 mt-1 text-success" />
                </div>
              </div>
            ))}
          </div>
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