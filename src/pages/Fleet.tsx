import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { VesselDetailsDialog } from '@/components/fleet/VesselDetailsDialog';
import { 
  Ship, 
  Plus, 
  Users, 
  MapPin,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { db } from '@/lib/database2';
import type { Vessel, Seafarer } from '@/lib/schemas';
import { INDEX_NAMES } from '@/lib/schemas';
import { useCompany } from '@/context/CompanyContext';

interface VesselWithDetails extends Vessel {
  crewDetails: {
    current: number;
    required: number;
    nextCrewChange: string;
    upcomingChanges: number;
  };
}

export default function Fleet() {
  const [vessels, setVessels] = useState<VesselWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVessel, setSelectedVessel] = useState<VesselWithDetails | null>(null);
  const [showVesselDialog, setShowVesselDialog] = useState(false);
  const { selectedCompany } = useCompany();

  useEffect(() => {
    const loadFleetData = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        const allVessels = await db.getVesselsByCompany(selectedCompany.id);
        // Enhance vessels with crew details computed from seafarers assigned to the vessel
        const vesselsWithDetails: VesselWithDetails[] = await Promise.all(
          allVessels.map(async (vessel) => {
            const onboardCrew: Seafarer[] = await db.getByIndex(
              'seafarers',
              INDEX_NAMES.SEAFARER_BY_VESSEL,
              vessel.id
            );
            const requiredCrew = getRequiredCrewByType(vessel.type);
            return {
              ...vessel,
              crewDetails: {
                current: onboardCrew.length,
                required: requiredCrew,
                nextCrewChange: '', // not modeled yet
                upcomingChanges: 0, // not modeled yet
              }
            };
          })
        );
        
        setVessels(vesselsWithDetails);
      } catch (error) {
        console.error('Failed to load fleet data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadFleetData();
  }, [selectedCompany]);

  const getRequiredCrewByType = (type: string): number => {
    switch (type.toLowerCase()) {
      case 'container ship': return 24;
      case 'bulk carrier': return 20;
      case 'tanker': return 22;
      case 'general cargo': return 18;
      default: return 20;
    }
  };

  const getCrewingStatus = (current: number, required: number) => {
    const percentage = (current / required) * 100;
    if (percentage >= 95) return { status: 'excellent', color: 'text-success' };
    if (percentage >= 85) return { status: 'good', color: 'text-primary' };
    if (percentage >= 75) return { status: 'adequate', color: 'text-warning' };
    return { status: 'critical', color: 'text-destructive' };
  };

  const getDaysUntilCrewChange = (date: string): number => {
    return Math.ceil((new Date(date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Fleet & Roster Management</h1>
            <p className="text-muted-foreground">Manage vessel crews and roster planning</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Roster Planner
            </Button>
            <Button className="ocean-gradient shadow-ocean">
              <Plus className="w-4 h-4 mr-2" />
              Add Vessel
            </Button>
          </div>
        </div>

        {/* Fleet Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Ship className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-2xl font-bold">{vessels.length}</p>
                  <p className="text-sm text-muted-foreground">Total Vessels</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-success" />
                <div>
                  <p className="text-2xl font-bold">
                    {vessels.filter(v => (v.crewDetails.current / v.crewDetails.required) >= 0.95).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Fully Manned</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-2xl font-bold">
                    {vessels.filter(v => getDaysUntilCrewChange(v.crewDetails.nextCrewChange) <= 14).length}
                  </p>
                  <p className="text-sm text-muted-foreground">Crew Changes Due</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-2xl font-bold">
                    {vessels.reduce((sum, v) => sum + v.crewDetails.current, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Crew Onboard</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Vessel Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {vessels.map((vessel) => {
            const crewingStatus = getCrewingStatus(vessel.crewDetails.current, vessel.crewDetails.required);
            const crewPercentage = (vessel.crewDetails.current / vessel.crewDetails.required) * 100;
            const daysToCrewChange = vessel.crewDetails.nextCrewChange
              ? getDaysUntilCrewChange(vessel.crewDetails.nextCrewChange)
              : undefined;
            
            return (
              <Card 
                key={vessel.id} 
                className="transition-smooth hover:shadow-lg cursor-pointer"
                onClick={() => {
                  setSelectedVessel(vessel);
                  setShowVesselDialog(true);
                }}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 ocean-gradient rounded-lg flex items-center justify-center">
                        <Ship className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{vessel.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{vessel.type}</p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {vessel.flag}
                    </Badge>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  {/* Crew Status */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Crew Level</span>
                      <span className={`text-sm font-medium ${crewingStatus.color}`}>
                        {vessel.crewDetails.current}/{vessel.crewDetails.required} ({Math.round(crewPercentage)}%)
                      </span>
                    </div>
                    <Progress value={crewPercentage} className="h-2" />
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Status: {crewingStatus.status}</span>
                      <span>IMO: {vessel.imoNumber}</span>
                    </div>
                  </div>

                  {/* Upcoming Events */}
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Upcoming Events</h4>
                    
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div>
                          <p className="text-sm font-medium">Next Crew Change</p>
                          <p className="text-xs text-muted-foreground">
                            {vessel.crewDetails.nextCrewChange ? new Date(vessel.crewDetails.nextCrewChange).toLocaleDateString() : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={daysToCrewChange !== undefined && daysToCrewChange <= 7 ? "destructive" : daysToCrewChange !== undefined && daysToCrewChange <= 14 ? "default" : "outline"}>
                          {daysToCrewChange !== undefined ? `${daysToCrewChange} days` : 'N/A'}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {vessel.crewDetails.upcomingChanges || 0} crew changes
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                       onClick={(e) => {
                         e.stopPropagation();
                         window.location.href = `/personnel?vessel=${encodeURIComponent(vessel.name)}`;
                       }}
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Crew
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                       onClick={(e) => {
                         e.stopPropagation();
                         setSelectedVessel(vessel);
                         setShowVesselDialog(true);
                       }}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Plan Roster
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {vessels.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Ship className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No vessels found</h3>
              <p className="text-muted-foreground mb-4">
                Start by adding your first vessel to the fleet
              </p>
              <Button className="ocean-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add First Vessel
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Vessel Details Dialog */}
        <VesselDetailsDialog
          vessel={selectedVessel}
          open={showVesselDialog}
          onOpenChange={setShowVesselDialog}
        />
      </div>
    );
}