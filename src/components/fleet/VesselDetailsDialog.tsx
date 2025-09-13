import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Ship, Users, MapPin, Calendar, AlertTriangle } from 'lucide-react';

interface VesselDetailsDialogProps {
  vessel: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VesselDetailsDialog({ vessel, open, onOpenChange }: VesselDetailsDialogProps) {
  if (!vessel) return null;

  const crewPercentage = (vessel.crewDetails.current / vessel.crewDetails.required) * 100;
  const daysToCrewChange = Math.ceil(
    (new Date(vessel.crewDetails.nextCrewChange).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ship className="w-5 h-5" />
            {vessel.name}
          </DialogTitle>
          <DialogDescription>
            Complete vessel information and crew management
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Vessel Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vessel Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Vessel Type</p>
                  <p className="font-medium">{vessel.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Flag</p>
                  <p className="font-medium">{vessel.flag}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">IMO Number</p>
                  <p className="font-medium">{vessel.imo}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Location</p>
                  <p className="font-medium flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {vessel.location || 'At Sea'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Crew Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Crew Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Crew Level</span>
                <span className="font-medium">
                  {vessel.crewDetails.current}/{vessel.crewDetails.required} ({Math.round(crewPercentage)}%)
                </span>
              </div>
              <Progress value={crewPercentage} className="h-3" />
              
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Crew</p>
                  <p className="font-medium">{vessel.crewDetails.current} seafarers</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Required Crew</p>
                  <p className="font-medium">{vessel.crewDetails.required} seafarers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">Next Crew Change</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(vessel.crewDetails.nextCrewChange).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant={daysToCrewChange <= 7 ? "destructive" : daysToCrewChange <= 14 ? "default" : "outline"}>
                    {daysToCrewChange} days
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    {vessel.crewDetails.upcomingChanges} crew changes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1">
              <Users className="w-4 h-4 mr-2" />
              Manage Crew
            </Button>
            <Button variant="outline" className="flex-1">
              <Calendar className="w-4 h-4 mr-2" />
              Plan Roster
            </Button>
            <Button className="flex-1 ocean-gradient">
              <Ship className="w-4 h-4 mr-2" />
              Edit Vessel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}