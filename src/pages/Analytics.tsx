import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { AnalyticsCharts } from '@/components/analytics/AnalyticsCharts';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3, 
  PieChart,
  Users,
  Ship,
  DollarSign,
  AlertTriangle,
  Calendar,
  Download,
  Filter,
  Brain,
  Target,
  Activity,
  Zap
} from 'lucide-react';

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

const kpis: KPI[] = [
  {
    title: 'Fleet Utilization',
    value: '87%',
    change: '+5%',
    trend: 'up',
    target: '90%'
  },
  {
    title: 'Crew Retention Rate',
    value: '94%',
    change: '+12%',
    trend: 'up',
    target: '95%'
  },
  {
    title: 'Average Contract Length',
    value: '8.2 months',
    change: '+0.8',
    trend: 'up'
  },
  {
    title: 'Compliance Score',
    value: '96%',
    change: '-1%',
    trend: 'down',
    target: '98%'
  },
  {
    title: 'Recruitment Cost per Hire',
    value: '$2,850',
    change: '-$420',
    trend: 'up'
  },
  {
    title: 'Training ROI',
    value: '340%',
    change: '+45%',
    trend: 'up'
  }
];

const predictiveInsights: PredictiveInsight[] = [
  {
    id: '1',
    type: 'risk',
    title: 'Certificate Expiry Risk',
    description: '15 critical certificates will expire in the next 60 days, potentially affecting 3 vessels',
    confidence: 92,
    impact: 'high',
    timeframe: 'Next 60 days'
  },
  {
    id: '2',
    type: 'opportunity',
    title: 'Crew Rotation Optimization',
    description: 'Adjusting rotation schedules could reduce costs by $45,000 annually while improving crew satisfaction',
    confidence: 78,
    impact: 'medium',
    timeframe: 'Next quarter'
  },
  {
    id: '3',
    type: 'recommendation',
    title: 'Training Investment',
    description: 'Investing in advanced bridge simulation training could reduce incidents by 23% based on industry data',
    confidence: 85,
    impact: 'high',
    timeframe: 'Next 6 months'
  },
  {
    id: '4',
    type: 'risk',
    title: 'Crew Fatigue Prediction',
    description: 'Current work patterns suggest increased fatigue risk for Chief Engineers on MV Atlantic Star',
    confidence: 88,
    impact: 'high',
    timeframe: 'Next 2 weeks'
  }
];

export default function Analytics() {
  const [timeframe, setTimeframe] = useState('last-month');
  const [selectedMetric, setSelectedMetric] = useState('all');

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

  return (
    <AppLayout>
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
            <Button variant="outline">
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
                          
                          <Button variant="outline" size="sm">
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
      </div>
    </AppLayout>
  );
}