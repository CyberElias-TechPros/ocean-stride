import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Calendar as CalendarIcon,
  Users,
  UserPlus,
  UserMinus,
  RotateCcw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths } from 'date-fns';
import { db } from '@/lib/database2';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/hooks/use-toast';
import type { Vessel, Seafarer, CrewAssignment } from '@/lib/schemas_v2';
import { INDEX_NAMES } from '@/lib/schemas';

interface RosterPlannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedVessel?: Vessel | null;
}

interface CalendarEvent {
  id: string;
  date: Date;
  type: 'assignment_start' | 'assignment_end' | 'rotation_change';
  assignment: CrewAssignment;
  seafarer: Seafarer;
  vessel: Vessel;
}

export function RosterPlannerModal({ open, onOpenChange, selectedVessel }: RosterPlannerModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [assignments, setAssignments] = useState<CrewAssignment[]>([]);
  const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
  const [availableSeafarers, setAvailableSeafarers] = useState<Seafarer[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [selectedVesselId, setSelectedVesselId] = useState<string>(selectedVessel?.id || '');
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  // Load data when modal opens
  useEffect(() => {
    if (open && selectedCompany) {
      loadData();
    }
  }, [open, selectedCompany]);

  // Update selected vessel when prop changes
  useEffect(() => {
    if (selectedVessel) {
      setSelectedVesselId(selectedVessel.id);
    }
  }, [selectedVessel]);

  const loadData = async () => {
    if (!selectedCompany) return;

    setLoading(true);
    try {
      // Load vessels
      const allVessels = await db.getVesselsByCompany(selectedCompany.id);
      setVessels(allVessels);

      // Load all assignments for the company (need to get all and filter by company)
      const allAssignments = await db.getAll<CrewAssignment>('crew_assignments');
      const companyAssignments = allAssignments.filter(a => a.companyId === selectedCompany.id);
      setAssignments(companyAssignments);

      // Load all seafarers for the company
      const allSeafarers = await db.getSeafarersByCompany(selectedCompany.id);
      setSeafarers(allSeafarers);

      // Calculate available seafarers (not currently assigned to any vessel)
      const assignedSeafarerIds = new Set(companyAssignments.filter(a => a.status === 'active').map(a => a.seafarerId));
      const available = allSeafarers.filter(s => !assignedSeafarerIds.has(s.id));
      setAvailableSeafarers(available);

      // Generate calendar events
      generateCalendarEvents(companyAssignments, allSeafarers, allVessels);
    } catch (error) {
      console.error('Failed to load roster data:', error);
      toast({
        title: "Error",
        description: "Failed to load roster data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarEvents = (assignments: CrewAssignment[], seafarers: Seafarer[], vessels: Vessel[]) => {
    const events: CalendarEvent[] = [];

    assignments.forEach(assignment => {
      const seafarer = seafarers.find(s => s.id === assignment.seafarerId);
      const vessel = vessels.find(v => v.id === assignment.vesselId);

      if (seafarer && vessel) {
        // Start date event
        events.push({
          id: `${assignment.id}-start`,
          date: new Date(assignment.startDate),
          type: 'assignment_start',
          assignment,
          seafarer,
          vessel
        });

        // End date event (if exists)
        if (assignment.endDate) {
          events.push({
            id: `${assignment.id}-end`,
            date: new Date(assignment.endDate),
            type: 'assignment_end',
            assignment,
            seafarer,
            vessel
          });
        }

        // Rotation change events (for rotating assignments)
        if (assignment.frequency === 'custom' && assignment.customFrequency) {
          const { daysOn, daysOff } = assignment.customFrequency;
          const cycleLength = daysOn + daysOff;
          let currentDate = new Date(assignment.startDate);

          // Generate rotation events for the next 6 months
          for (let i = 0; i < 12; i++) {
            const rotationEnd = new Date(currentDate);
            rotationEnd.setDate(rotationEnd.getDate() + daysOn);

            if (rotationEnd > new Date()) {
              events.push({
                id: `${assignment.id}-rotation-${i}`,
                date: rotationEnd,
                type: 'rotation_change',
                assignment,
                seafarer,
                vessel
              });
            }

            currentDate.setDate(currentDate.getDate() + cycleLength);
          }
        }
      }
    });

    setCalendarEvents(events);
  };

  const getEventsForDate = (date: Date) => {
    return calendarEvents.filter(event =>
      event.date.toDateString() === date.toDateString() &&
      (!selectedVesselId || event.vessel.id === selectedVesselId)
    );
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev =>
      direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1)
    );
  };

  const handleAssignSeafarer = async (seafarerId: string, vesselId: string, startDate: string) => {
    if (!vesselId) {
      toast({
        title: "Error",
        description: "Please select a vessel first",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignment: Omit<CrewAssignment, 'id' | 'createdAt' | 'updatedAt'> = {
        seafarerId,
        vesselId,
        rankId: '', // Will need to be selected
        startDate,
        status: 'draft',
        salary: 0,
        currency: 'USD',
        rotationType: 'fixed_term',
        frequency: 'single',
        documents: [],
        isActive: false,
        signedBySeafarer: false,
        signedByCompany: false,
        createdBy: '',
        updatedBy: '',
        companyId: selectedCompany?.id || ''
      };

      await db.create('crew_assignments', assignment);
      await loadData();

      toast({
        title: "Success",
        description: "Seafarer assigned successfully",
      });
    } catch (error) {
      console.error('Failed to assign seafarer:', error);
      toast({
        title: "Error",
        description: "Failed to assign seafarer",
        variant: "destructive",
      });
    }
  };

  const handleBulkRotation = async () => {
    // Get assignments ending in the next 30 days
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const assignmentsToRotate = assignments.filter(a =>
      a.endDate &&
      new Date(a.endDate) <= thirtyDaysFromNow &&
      a.status === 'active'
    );

    if (assignmentsToRotate.length === 0) {
      toast({
        title: "No rotations needed",
        description: "No assignments ending in the next 30 days",
      });
      return;
    }

    try {
      // Create new assignments for rotation
      const rotationPromises = assignmentsToRotate.map(async (assignment) => {
        const newStartDate = new Date(assignment.endDate!);
        newStartDate.setDate(newStartDate.getDate() + 1); // Next day after current assignment ends

        const newAssignment: Omit<CrewAssignment, 'id' | 'createdAt' | 'updatedAt'> = {
          seafarerId: assignment.seafarerId,
          vesselId: assignment.vesselId,
          rankId: assignment.rankId,
          startDate: newStartDate.toISOString(),
          endDate: undefined, // Open-ended for now
          status: 'draft',
          salary: assignment.salary,
          currency: assignment.currency,
          rotationType: assignment.rotationType,
          frequency: assignment.frequency,
          customFrequency: assignment.customFrequency,
          notes: `Rotation from ${assignment.startDate}`,
          documents: [],
          isActive: false,
          signedBySeafarer: false,
          signedByCompany: false,
          createdBy: '',
          updatedBy: '',
          companyId: selectedCompany?.id || ''
        };

        return db.create('crew_assignments', newAssignment);
      });

      await Promise.all(rotationPromises);
      await loadData();

      toast({
        title: "Success",
        description: `Created ${assignmentsToRotate.length} rotation assignments`,
      });
    } catch (error) {
      console.error('Failed to create bulk rotations:', error);
      toast({
        title: "Error",
        description: "Failed to create bulk rotations",
        variant: "destructive",
      });
    }
  };

  const handleMassAssignment = async () => {
    if (availableSeafarers.length === 0) {
      toast({
        title: "No available seafarers",
        description: "All seafarers are currently assigned",
      });
      return;
    }

    // For now, assign all available seafarers to the first vessel
    const targetVesselId = selectedVesselId || vessels[0]?.id;
    if (!targetVesselId) {
      toast({
        title: "No vessel selected",
        description: "Please select a vessel first",
        variant: "destructive",
      });
      return;
    }

    try {
      const assignmentPromises = availableSeafarers.map(async (seafarer) => {
        const assignment: Omit<CrewAssignment, 'id' | 'createdAt' | 'updatedAt'> = {
          seafarerId: seafarer.id,
          vesselId: targetVesselId,
          rankId: '', // Will need to be selected
          startDate: new Date().toISOString(),
          status: 'draft',
          salary: 0,
          currency: 'USD',
          rotationType: 'fixed_term',
          frequency: 'single',
          documents: [],
          isActive: false,
          signedBySeafarer: false,
          signedByCompany: false,
          createdBy: '',
          updatedBy: '',
          companyId: selectedCompany?.id || ''
        };

        return db.create('crew_assignments', assignment);
      });

      await Promise.all(assignmentPromises);
      await loadData();

      toast({
        title: "Success",
        description: `Assigned ${availableSeafarers.length} seafarers to vessel`,
      });
    } catch (error) {
      console.error('Failed to create mass assignments:', error);
      toast({
        title: "Error",
        description: "Failed to create mass assignments",
        variant: "destructive",
      });
    }
  };

  const handleBulkSignOff = async () => {
    // Get assignments that can be signed off (ending soon or completed)
    const assignmentsToSignOff = assignments.filter(a =>
      (a.endDate && new Date(a.endDate) <= new Date()) ||
      a.status === 'completed'
    );

    if (assignmentsToSignOff.length === 0) {
      toast({
        title: "No assignments to sign off",
        description: "No assignments are ready for sign-off",
      });
      return;
    }

    try {
      const signOffPromises = assignmentsToSignOff.map(async (assignment) => {
        const updates: Partial<CrewAssignment> = {
          status: 'completed',
          signOffDate: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        return db.update('crew_assignments', assignment.id, updates);
      });

      await Promise.all(signOffPromises);
      await loadData();

      toast({
        title: "Success",
        description: `Signed off ${assignmentsToSignOff.length} assignments`,
      });
    } catch (error) {
      console.error('Failed to sign off assignments:', error);
      toast({
        title: "Error",
        description: "Failed to sign off assignments",
        variant: "destructive",
      });
    }
  };

  const renderCalendarView = () => {
    const days = getDaysInMonth();
    const startDate = startOfMonth(currentDate);
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <div className="space-y-4">
        {/* Calendar Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h3 className="text-lg font-semibold">
              {format(currentDate, 'MMMM yyyy')}
            </h3>
            <Button variant="outline" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
              <Select
                value={selectedVesselId || ''}
                onValueChange={setSelectedVesselId}
                defaultValue={vessels[0]?.id || ''}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a vessel" />
                </SelectTrigger>
                <SelectContent>
                  {vessels.map((vessel) => (
                    <SelectItem key={vessel.id} value={vessel.id}>
                      {vessel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Week day headers */}
          {weekDays.map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-muted-foreground">
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {days.map(day => {
            const events = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isCurrentDay = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`
                  min-h-24 p-2 border rounded-lg cursor-pointer hover:bg-muted/50
                  ${!isCurrentMonth ? 'text-muted-foreground bg-muted/20' : ''}
                  ${isCurrentDay ? 'bg-primary/10 border-primary' : ''}
                `}
                onDrop={(e) => {
                  e.preventDefault();
                  const data = JSON.parse(e.dataTransfer.getData('application/json'));
                  if (data.type === 'seafarer') {
                    handleAssignSeafarer(data.seafarerId, selectedVesselId || vessels[0]?.id, day.toISOString());
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
              >
                <div className="text-sm font-medium mb-1">
                  {format(day, 'd')}
                </div>

                <div className="space-y-1">
                  {events.slice(0, 3).map(event => (
                    <Badge
                      key={event.id}
                      variant={
                        event.type === 'assignment_start' ? 'default' :
                        event.type === 'assignment_end' ? 'destructive' :
                        'secondary'
                      }
                      className="text-xs w-full justify-start"
                    >
                      {event.type === 'assignment_start' && <UserPlus className="w-3 h-3 mr-1" />}
                      {event.type === 'assignment_end' && <UserMinus className="w-3 h-3 mr-1" />}
                      {event.type === 'rotation_change' && <RotateCcw className="w-3 h-3 mr-1" />}
                      {event.seafarer.personalInfo.firstName} {event.seafarer.personalInfo.lastName.charAt(0)}.
                    </Badge>
                  ))}

                  {events.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{events.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAvailableSeafarers = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          Available Seafarers ({availableSeafarers.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-2">
            {availableSeafarers.map(seafarer => (
              <div
                key={seafarer.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'seafarer',
                    seafarerId: seafarer.id
                  }));
                }}
              >
                <div>
                  <p className="font-medium">
                    {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {seafarer.employment.rank} • {seafarer.employment.status}
                  </p>
                </div>
                <Badge variant="outline">
                  Available
                </Badge>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Roster Planner
            {selectedVessel && ` - ${selectedVessel.name}`}
          </DialogTitle>
          <DialogDescription>
            Plan crew assignments, view rotation schedules, and manage crew changes
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Calendar/List View */}
          <div className="lg:col-span-3">
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar">Calendar View</TabsTrigger>
                <TabsTrigger value="list">List View</TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="mt-4">
                {renderCalendarView()}
              </TabsContent>

              <TabsContent value="list" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Assignment List</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                      List view coming soon...
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {renderAvailableSeafarers()}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Bulk Operations</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleBulkRotation()}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Bulk Rotation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleMassAssignment()}
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Mass Assignment
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => handleBulkSignOff()}
                >
                  <UserMinus className="w-4 h-4 mr-2" />
                  Bulk Sign-off
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}