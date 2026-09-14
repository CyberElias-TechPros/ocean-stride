import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  Ship, 
  DollarSign, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Globe
} from 'lucide-react';

interface StatsData {
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

interface DashboardStatsProps {
  data: StatsData;
}

export function DashboardStats({ data }: DashboardStatsProps) {
  const crewingEfficiency = Math.round((data.vessels.fullyManned / data.vessels.total) * 100);
  const activeCrewPercentage = Math.round((data.seafarers.active / data.seafarers.total) * 100);

  const statCards = [
    {
      title: 'Total Seafarers',
      value: data.seafarers.total.toLocaleString(),
      subtitle: `${data.seafarers.active} active`,
      icon: Users,
      trend: '+12%',
      trendUp: true,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
    },
    {
      title: 'Fleet Status',
      value: data.vessels.total.toString(),
      subtitle: `${data.vessels.fullyManned} fully manned`,
      icon: Ship,
      trend: `${crewingEfficiency}%`,
      trendUp: crewingEfficiency > 80,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
    },
    {
      title: 'Monthly Payroll',
      value: `$${(data.payroll.monthlyTotal / 1000).toFixed(0)}K`,
      subtitle: `${data.payroll.recordsCount} records`,
      icon: DollarSign,
      trend: '+8%',
      trendUp: true,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Efficiency',
      value: `${activeCrewPercentage}%`,
      subtitle: 'Crew utilization',
      icon: TrendingUp,
      trend: '+5%',
      trendUp: true,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statCards.map((stat, index) => {
        const Icon = stat.icon;
        
        return (
          <Card key={index} className="transition-smooth hover:shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground mb-1">
                {stat.value}
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {stat.subtitle}
                </p>
                <Badge 
                  variant="outline" 
                  className={stat.trendUp ? 'text-success border-success/30' : 'text-destructive border-destructive/30'}
                >
                  {stat.trend}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function QuickActions() {
  const actions = [
    {
      title: 'Add New Seafarer',
      description: 'Register a new crew member',
      icon: Users,
      color: 'bg-primary/10 text-primary',
      urgent: false,
    },
    {
      title: 'Schedule Crew Change',
      description: 'Plan vessel crew rotation',
      icon: Clock,
      color: 'bg-accent/10 text-accent',
      urgent: false,
    },
    {
      title: 'Certificate Alerts',
      description: '3 certificates expiring soon',
      icon: AlertCircle,
      color: 'bg-warning/10 text-warning',
      urgent: true,
    },
    {
      title: 'Process Payroll',
      description: 'Monthly payroll ready',
      icon: DollarSign,
      color: 'bg-success/10 text-success',
      urgent: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <CheckCircle className="w-5 h-5 text-primary" />
          <span>Quick Actions</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <div 
              key={index}
              className="flex items-center space-x-4 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-smooth cursor-pointer"
            >
              <div className={`p-2 rounded-lg ${action.color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <p className="text-sm font-medium">{action.title}</p>
                  {action.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      Urgent
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function RecentActivity() {
  const activities = [
    {
      action: 'Crew Change Completed',
      details: 'MV Ocean Pride - 8 crew members',
      time: '2 hours ago',
      type: 'success',
    },
    {
      action: 'New Seafarer Registered',
      details: 'John Martinez - Chief Engineer',
      time: '4 hours ago',
      type: 'info',
    },
    {
      action: 'Certificate Expiry Alert',
      details: 'Sarah Chen - STCW Basic Safety',
      time: '6 hours ago',
      type: 'warning',
    },
    {
      action: 'Payroll Processed',
      details: 'March 2024 - 156 seafarers',
      time: '1 day ago',
      type: 'success',
    },
  ];

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-success';
      case 'warning': return 'text-warning';
      case 'info': return 'text-primary';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Globe className="w-5 h-5 text-primary" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-smooth">
            <div className={`w-2 h-2 rounded-full mt-2 ${getActivityColor(activity.type).replace('text-', 'bg-')}`} />
            <div className="flex-1">
              <p className="text-sm font-medium">{activity.action}</p>
              <p className="text-xs text-muted-foreground">{activity.details}</p>
              <p className="text-xs text-muted-foreground mt-1">{activity.time}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}