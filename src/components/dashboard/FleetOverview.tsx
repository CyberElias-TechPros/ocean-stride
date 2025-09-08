import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ship, Users, MapPin, AlertTriangle } from 'lucide-react';

interface Vessel {
  id: string;
  name: string;
  type: string;
  location: string;
  crewCount: number;
  maxCrew: number;
  status: 'operational' | 'maintenance' | 'dry-dock';
  nextCrewChange: string;
}

const mockVessels: Vessel[] = [
  {
    id: '1',
    name: 'MV Ocean Pride',
    type: 'Container Ship',
    location: 'Singapore',
    crewCount: 22,
    maxCrew: 24,
    status: 'operational',
    nextCrewChange: '2024-04-15',
  },
  {
    id: '2',
    name: 'MV Baltic Star',
    type: 'Bulk Carrier',
    location: 'Hamburg',
    crewCount: 18,
    maxCrew: 20,
    status: 'operational',
    nextCrewChange: '2024-04-22',
  },
  {
    id: '3',
    name: 'MV Pacific Dawn',
    type: 'Tanker',
    location: 'Houston',
    crewCount: 16,
    maxCrew: 22,
    status: 'maintenance',
    nextCrewChange: '2024-05-01',
  },
  {
    id: '4',
    name: 'MV Atlantic Wave',
    type: 'Container Ship',
    location: 'Rotterdam',
    crewCount: 24,
    maxCrew: 24,
    status: 'operational',
    nextCrewChange: '2024-04-18',
  },
];

export function FleetOverview() {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'bg-success text-success-foreground';
      case 'maintenance': return 'bg-warning text-warning-foreground';
      case 'dry-dock': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getCrewingStatus = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage >= 90) return 'excellent';
    if (percentage >= 80) return 'good';
    if (percentage >= 70) return 'adequate';
    return 'critical';
  };

  const getCrewingColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'text-success';
      case 'good': return 'text-primary';
      case 'adequate': return 'text-warning';
      case 'critical': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Ship className="w-5 h-5 text-primary" />
          <span>Fleet Overview</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mockVessels.map((vessel) => {
          const crewPercentage = (vessel.crewCount / vessel.maxCrew) * 100;
          const crewingStatus = getCrewingStatus(vessel.crewCount, vessel.maxCrew);
          const daysToCrewChange = Math.ceil(
            (new Date(vessel.nextCrewChange).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          );

          return (
            <div key={vessel.id} className="p-4 border border-border rounded-lg space-y-3 hover:bg-muted/30 transition-smooth">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-sm">{vessel.name}</h4>
                  <p className="text-xs text-muted-foreground">{vessel.type}</p>
                </div>
                <Badge className={getStatusColor(vessel.status)}>
                  {vessel.status}
                </Badge>
              </div>

              {/* Location and crew info */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-1 text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{vessel.location}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span className={getCrewingColor(crewingStatus)}>
                    {vessel.crewCount}/{vessel.maxCrew} crew
                  </span>
                </div>
              </div>

              {/* Crew progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Crew Level</span>
                  <span className={getCrewingColor(crewingStatus)}>
                    {Math.round(crewPercentage)}%
                  </span>
                </div>
                <Progress 
                  value={crewPercentage} 
                  className="h-2"
                />
              </div>

              {/* Next crew change */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Next crew change</span>
                <div className="flex items-center space-x-1">
                  {daysToCrewChange <= 7 && (
                    <AlertTriangle className="w-3 h-3 text-warning" />
                  )}
                  <span className={daysToCrewChange <= 7 ? 'text-warning' : 'text-muted-foreground'}>
                    {daysToCrewChange} days
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}