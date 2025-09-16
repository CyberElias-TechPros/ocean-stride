import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Ship, Users, MapPin, AlertTriangle } from 'lucide-react';
import { useCompany } from '@/context/CompanyContext';
import { db, type Vessel as DbVessel, type Seafarer } from '@/lib/database';

interface FleetVessel extends DbVessel {
  crewCount: number;
  maxCrew: number;
  location: string;
  status: 'operational' | 'maintenance' | 'dry-dock';
  nextCrewChange: string;
}

export function FleetOverview() {
  const [vessels, setVessels] = useState<FleetVessel[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompany();

  useEffect(() => {
    const loadFleetData = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        const [companyVessels, companySeafarers] = await Promise.all([
          db.getVesselsByCompany(selectedCompany.id),
          db.getSeafarersByCompany(selectedCompany.id)
        ]);
        
        const fleetVessels: FleetVessel[] = companyVessels.map(vessel => {
          const assignedCrew = companySeafarers.filter(s => s.employment.currentVessel === vessel.name);
          const maxCrew = getMaxCrewByType(vessel.type);
          
          return {
            ...vessel,
            crewCount: assignedCrew.length,
            maxCrew,
            location: ['Singapore', 'Hamburg', 'Houston', 'Rotterdam', 'Dubai'][Math.floor(Math.random() * 5)],
            status: ['operational', 'maintenance', 'dry-dock'][Math.floor(Math.random() * 3)] as 'operational' | 'maintenance' | 'dry-dock',
            nextCrewChange: new Date(Date.now() + Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          };
        });
        
        setVessels(fleetVessels);
      } catch (error) {
        console.error('Failed to load fleet data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFleetData();
  }, [selectedCompany]);

  const getMaxCrewByType = (type: string): number => {
    switch (type.toLowerCase()) {
      case 'container ship': return 24;
      case 'bulk carrier': return 20;
      case 'tanker': return 22;
      case 'general cargo': return 18;
      default: return 20;
    }
  };
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
        {loading ? (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading fleet data...</p>
          </div>
        ) : vessels.length === 0 ? (
          <div className="text-center py-4">
            <Ship className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No vessels found</p>
          </div>
        ) : (
          vessels.map((vessel) => {
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
          })
        )}
      </CardContent>
    </Card>
  );
}