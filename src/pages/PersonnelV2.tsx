import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, Plus, Users, MoreHorizontal, User, Mail, Phone, 
  Edit, Trash2, Ship, Download, Briefcase, FileCheck, Wallet
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format, addDays } from 'date-fns';
import { db } from '@/lib/database2';
import type { Seafarer, Certificate, Vessel, BaseEntity } from '@/lib/schemas_v2';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas_v2';
import { useCompany } from '@/context/CompanyContext';
import { AssignmentForm } from '@/components/assignment/AssignmentForm';
import { PayrollForm } from '@/components/payroll/PayrollForm';
import { z } from 'zod';
import type { CrewAssignment, Payroll, AssignmentStatus, PayrollStatus, PayrollItem } from '@/types';

type SeafarerWithDetails = Seafarer & BaseEntity & {
  certificates?: Certificate[];
  currentAssignment?: (CrewAssignment & BaseEntity) | null;
  rankDetails?: (Rank & BaseEntity) | null;
  vesselDetails?: (Vessel & BaseEntity) | null;
  assignments?: (CrewAssignment & BaseEntity)[];
  payrolls?: (Payroll & BaseEntity)[];
  personalInfo?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
};

type AssignmentWithDetails = CrewAssignment & BaseEntity & {
  seafarerDetails?: Seafarer & BaseEntity;
  vesselDetails?: Vessel & BaseEntity;
  rankDetails?: Rank & BaseEntity;
  status: AssignmentStatus;
  startDate: string;
  endDate?: string;
  salary: number;
  currency: string;
  rotationType: 'fixed_term' | 'rotation';
  frequency: 'single' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  customFrequency?: {
    daysOn: number;
    daysOff: number;
  };
  notes?: string;
};

type PayrollWithDetails = Payroll & BaseEntity & {
  seafarerDetails?: Seafarer & BaseEntity;
  vesselDetails?: Vessel & BaseEntity;
  status: PayrollStatus;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  basicSalary: number;
  items: PayrollItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'other';
  paymentReference?: string;
  notes?: string;
  documents: string[];
};

// Helper type to create new entities with optional base fields
// Helper type for creating new entities with required BaseEntity fields
type CreateEntity<T> = Omit<T, keyof BaseEntity> & {
  id?: string;
  companyId: string;
  createdAt?: string;
  updatedAt?: string;
};

const RANKS = [
  'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
  'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
  'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Cook', 'Steward'
];

export default function PersonnelV2() {
  const navigate = useNavigate();
  const { selectedCompany } = useCompany();
  const { toast } = useToast();
  
  // State
  const [activeTab, setActiveTab] = useState('seafarers');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [seafarers, setSeafarers] = useState<SeafarerWithDetails[]>([]);
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollWithDetails[]>([]);
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [selectedSeafarer, setSelectedSeafarer] = useState<SeafarerWithDetails | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollWithDetails | null>(null);
  const [assignmentFormData, setAssignmentFormData] = useState<Partial<CrewAssignment> | null>(null);
  const [payrollFormData, setPayrollFormData] = useState<Partial<Payroll> | null>(null);
  
  // Load data
  useEffect(() => {
    if (!selectedCompany) return;
    
    const loadData = async () => {
      setLoading(true);
      try {
        await db.init();
        
        // Load all data in parallel
        const [
          seafarersData, 
          vesselsData, 
          ranksData, 
          assignmentsData, 
          payrollsData
        ] = await Promise.all([
          db.getByIndex<Seafarer & BaseEntity>(STORE_NAMES.SEAFARERS, 'by_company', selectedCompany.id),
          db.getByIndex<Vessel & BaseEntity>(STORE_NAMES.VESSELS, 'by_company', selectedCompany.id),
          db.getByIndex<Rank & BaseEntity>(STORE_NAMES.RANKS, 'by_company', selectedCompany.id),
          db.getByIndex<CrewAssignment & BaseEntity>(STORE_NAMES.CREW_ASSIGNMENTS, 'by_company', selectedCompany.id),
          db.getByIndex<Payroll & BaseEntity>(STORE_NAMES.PAYROLLS, 'by_company', selectedCompany.id)
        ]);

        // Enrich assignments with related data
        const enrichedAssignments = assignmentsData.map(assignment => ({
          ...assignment,
          seafarerDetails: seafarersData.find(s => s.id === assignment.seafarerId),
          vesselDetails: vesselsData.find(v => v.id === assignment.vesselId),
          rankDetails: ranksData.find(r => r.id === assignment.rankId)
        } as AssignmentWithDetails));

        // Enrich payrolls with related data
        const enrichedPayrolls = payrollsData.map(payroll => ({
          ...payroll,
          seafarerDetails: seafarersData.find(s => s.id === payroll.seafarerId),
          vesselDetails: vesselsData.find(v => v.id === payroll.vesselId)
        } as PayrollWithDetails));

        // Enrich seafarers with related data
        const enrichedSeafarers = seafarersData.map(seafarer => {
          // Find active assignment (if any)
          const activeAssignment = enrichedAssignments
            .find(a => a.seafarerId === seafarer.id && a.status === 'active');
          
          // Get all assignments for this seafarer
          const seafarerAssignments = assignmentsData
            .filter(a => a.seafarerId === seafarer.id)
            .map(assignment => ({
              ...assignment,
              vesselDetails: vesselsData.find(v => v.id === assignment.vesselId),
              rankDetails: ranksData.find(r => r.id === assignment.rankId)
            } as AssignmentWithDetails));

          // Get all payrolls for this seafarer
          const seafarerPayrolls = payrollsData
            .filter(p => p.seafarerId === seafarer.id)
            .map(payroll => ({
              ...payroll,
              vesselDetails: vesselsData.find(v => v.id === payroll.vesselId)
            } as PayrollWithDetails));

          return {
            ...seafarer,
            currentAssignment: activeAssignment || null,
            rankDetails: ranksData.find(r => r.id === seafarer.rankId),
            vesselDetails: activeAssignment 
              ? vesselsData.find(v => v.id === activeAssignment.vesselId)
              : undefined,
            assignments: seafarerAssignments,
            payrolls: seafarerPayrolls
          } as SeafarerWithDetails;
        });

        setSeafarers(enrichedSeafarers);
        setVessels(vesselsData as (Vessel & BaseEntity)[]);
        setRanks(ranksData as (Rank & BaseEntity)[]);
        setAssignments(enrichedAssignments);
        setPayrolls(enrichedPayrolls);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, toast]);
  
  // Filter seafarers
  const filteredSeafarers = seafarers.filter(seafarer => {
    const matchesSearch = 
      seafarer.personalInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seafarer.personalInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seafarer.employment.rank.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || seafarer.employment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });
  
  // Status counts
  const statusCounts = {
    all: seafarers.length,
    onboard: seafarers.filter(s => s.employment.status === 'onboard').length,
    on_leave: seafarers.filter(s => s.employment.status === 'on_leave').length,
  };
  
  // UI Helpers
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'onboard': return 'bg-green-100 text-green-800';
      case 'on_leave': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handle form submissions
  const handleAddSeafarer = async (seafarerData: Partial<Seafarer>) => {
    if (!selectedCompany) return;
    
    try {
      const newSeafarer = await db.create<Seafarer>(STORE_NAMES.SEAFARERS, {
        ...seafarerData,
        companyId: selectedCompany.id,
      } as Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>);
      
      setSeafarers(prev => [...prev, newSeafarer as SeafarerWithDetails]);
      setShowAddDialog(false);
      
      toast({
        title: 'Success',
        description: 'Seafarer added successfully'
      });
      
    } catch (error) {
      console.error('Error adding seafarer:', error);
      toast({
        title: 'Error',
        description: 'Failed to add seafarer',
        variant: 'destructive'
      });
    }
  };
  
  const handleAddAssignment = async (assignmentData: Omit<CrewAssignment, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => {
    if (!selectedCompany || !selectedSeafarer) return;
    
    try {
      const now = new Date().toISOString();
      const newAssignment = await db.create<CrewAssignment & BaseEntity>(STORE_NAMES.CREW_ASSIGNMENTS, {
        ...assignmentData,
        seafarerId: selectedSeafarer.id,
        companyId: selectedCompany.id,
        status: assignmentData.status || 'scheduled',
        createdAt: now,
        updatedAt: now,
        documents: assignmentData.documents || [],
        isActive: assignmentData.status === 'active',
        signedBySeafarer: false,
        signedByCompany: false,
        createdBy: 'system', // TODO: Replace with actual user ID
        updatedBy: 'system'  // TODO: Replace with actual user ID
      } as CrewAssignment & BaseEntity);
      
      // Update local state
      const enrichedAssignment: AssignmentWithDetails = {
        ...newAssignment,
        seafarerDetails: selectedSeafarer,
        vesselDetails: vessels.find(v => v.id === assignmentData.vesselId),
        rankDetails: ranks.find(r => r.id === assignmentData.rankId)
      };
      
      setAssignments(prev => [...prev, enrichedAssignment]);
      
      // If this is an active assignment, update the seafarer's current assignment
      if (newAssignment.status === 'active') {
        const updatedSeafarer = await db.update<Seafarer & BaseEntity>(
          STORE_NAMES.SEAFARERS, 
          selectedSeafarer.id,
          { 
            'employment.currentAssignmentId': newAssignment.id,
            'employment.currentVesselId': newAssignment.vesselId,
            'employment.rank': newAssignment.rankId,
            'employment.status': 'onboard',
            'updatedAt': now
          }
        );
        
        setSeafarers(prev => 
          prev.map(s => 
            s.id === selectedSeafarer.id 
              ? { 
                  ...s, 
                  ...updatedSeafarer, 
                  currentAssignment: enrichedAssignment,
                  vesselDetails: enrichedAssignment.vesselDetails
                }
              : s
          )
        );
      }
      
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
        variant: 'default'
      });
      
      setShowAssignmentDialog(false);
      setSelectedAssignment(null);
    } catch (error) {
      console.error('Error creating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive'
      });
    }
  };
  
  const handleEditAssignment = async (assignmentId: string, assignmentData: Partial<CrewAssignment>) => {
    if (!selectedCompany) return;
    
    try {
      const now = new Date().toISOString();
      const updatedAssignment = await db.update<CrewAssignment & BaseEntity>(
        STORE_NAMES.CREW_ASSIGNMENTS, 
        assignmentId,
        {
          ...assignmentData,
          updatedAt: now
        }
      );
      
      // Update local state
      setAssignments(prev => 
        prev.map(a => 
          a.id === assignmentId 
            ? { 
                ...a, 
                ...updatedAssignment 
              }
            : a
        )
      );
      
      toast({
        title: 'Success',
        description: 'Assignment updated successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error updating assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to update assignment',
        variant: 'destructive'
      });
    }
  };
  
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!selectedCompany) return;
    
    try {
      await db.delete(STORE_NAMES.CREW_ASSIGNMENTS, assignmentId);
      
      // Update local state
      setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      
      toast({
        title: 'Success',
        description: 'Assignment deleted successfully',
        variant: 'default'
      });
    } catch (error) {
      console.error('Error deleting assignment:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        variant: 'destructive'
      });
    }
  };
  
  const handleUpdatePayroll = async (payrollId: string, payrollData: Partial<Payroll>) => {
    if (!selectedCompany) return;
    
    try {
      const now = new Date().toISOString();
      
      // Calculate totals if items were updated
      let updateData: Partial<Payroll> = { ...payrollData, updatedAt: now };
      
      if (payrollData.items) {
        const totalEarnings = payrollData.items
          .filter(item => ['salary', 'overtime', 'bonus', 'allowance', 'reimbursement'].includes(item.type))
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        const totalDeductions = payrollData.items
          .filter(item => item.type === 'deduction')
          .reduce((sum, item) => sum + (item.amount || 0), 0);
        
        updateData = {
          ...updateData,
          totalEarnings,
          totalDeductions,
          netPay: totalEarnings - totalDeductions,
          items: payrollData.items.map(item => ({
            ...item,
            amount: item.amount || 0,
            taxable: item.taxable !== undefined ? item.taxable : true
          }))
        };
      }
      
      const updatedPayroll = await db.update<Payroll & BaseEntity>(
        STORE_NAMES.PAYROLLS, 
        payrollId,
        updateData
      );
      
      // Update local state
      setPayrolls(prev => 
        prev.map(p => 
          p.id === payrollId 
            ? { 
                ...p, 
                ...updatedPayroll,
                seafarerDetails: p.seafarerDetails,
                vesselDetails: p.vesselDetails
              }
            : p
        )
      );
      
      // Update seafarer's payrolls if needed
      if (selectedSeafarer) {
        setSeafarers(prev => 
          prev.map(s => 
            s.id === selectedSeafarer.id
              ? { 
                  ...s, 
                  payrolls: s.payrolls?.map(p => 
                    p.id === payrollId 
                      ? { ...p, ...updatedPayroll, seafarerDetails: s, vesselDetails: p.vesselDetails }
                      : p
                  ) || []
                }
              : s
          )
        );
      }
      
      toast({
        title: 'Success',
        description: 'Payroll updated successfully',
        variant: 'default'
      });
      
      return updatedPayroll;
    } catch (error) {
      console.error('Error updating payroll:', error);
      toast({
        title: 'Error',
        description: 'Failed to update payroll',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleDeletePayroll = async (payrollId: string) => {
    if (!confirm('Are you sure you want to delete this payroll? This action cannot be undone.')) return;
    
    try {
      await db.delete(STORE_NAMES.PAYROLLS, payrollId);
      
      // Update local state
      setPayrolls(prev => prev.filter(p => p.id !== payrollId));
      
      // Update seafarer's payrolls
      if (selectedSeafarer) {
        setSeafarers(prev => 
          prev.map(s => 
            s.id === selectedSeafarer.id
              ? { 
                  ...s, 
                  payrolls: s.payrolls?.filter(p => p.id !== payrollId) || [] 
                }
              : s
          )
        );
      }
      
      toast({
        title: 'Success',
        description: 'Payroll deleted successfully',
        variant: 'default'
      });
      
      return true;
    } catch (error) {
      console.error('Error deleting payroll:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete payroll',
        variant: 'destructive'
      });
      throw error;
    }
  };

  const handleAddPayroll = async (payrollData: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'status'>) => {
    if (!selectedCompany || !selectedSeafarer) return;
    
    try {
      const now = new Date().toISOString();
      
      // Calculate totals if not provided
      const items = payrollData.items || [];
      const totalEarnings = items
        .filter(item => ['salary', 'overtime', 'bonus', 'allowance', 'reimbursement'].includes(item.type))
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const totalDeductions = items
        .filter(item => item.type === 'deduction')
        .reduce((sum, item) => sum + (item.amount || 0), 0);
      
      const newPayroll = await db.create<Payroll & BaseEntity>(STORE_NAMES.PAYROLLS, {
        ...payrollData,
        seafarerId: selectedSeafarer.id,
        companyId: selectedCompany.id,
        status: 'draft',
        totalEarnings,
        totalDeductions,
        netPay: totalEarnings - totalDeductions,
        items: items.map(item => ({
          ...item,
          amount: item.amount || 0,
          taxable: item.taxable !== undefined ? item.taxable : true
        })),
        documents: payrollData.documents || [],
        createdAt: now,
        updatedAt: now
      } as Payroll & BaseEntity);
      
      // Update local state
      const enrichedPayroll: PayrollWithDetails = {
        ...newPayroll,
        seafarerDetails: selectedSeafarer,
        vesselDetails: vessels.find(v => v.id === payrollData.vesselId)
      };
      
      setPayrolls(prev => [...prev, enrichedPayroll]);
      
      // Update seafarer's payrolls
      setSeafarers(prev => 
        prev.map(s => 
          s.id === selectedSeafarer.id
            ? { 
                ...s, 
                payrolls: [...(s.payrolls || []), enrichedPayroll] 
              }
            : s
        )
      );
      
      toast({
        title: 'Success',
        description: 'Payroll created successfully',
        variant: 'default'
      });
      
      setShowPayrollDialog(false);
      setSelectedPayroll(null);
    } catch (error) {
      console.error('Error creating payroll:', error);
      toast({
        title: 'Error',
        description: 'Failed to create payroll',
        variant: 'destructive'
      });
    }
  };
  
  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading personnel data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Personnel Management</h1>
          <p className="text-muted-foreground">Manage your seafarer database</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            className="ocean-gradient shadow-ocean"
            onClick={() => {
              setSelectedSeafarer(null);
              setShowAddDialog(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Seafarer
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="seafarers">
            <Users className="w-4 h-4 mr-2" />
            Seafarers
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <Briefcase className="w-4 h-4 mr-2" />
            Assignments
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <FileCheck className="w-4 h-4 mr-2" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="payroll">
            <Wallet className="w-4 h-4 mr-2" />
            Payroll
          </TabsTrigger>
        </TabsList>
        
        {/* Seafarers Tab */}
        <TabsContent value="seafarers" className="space-y-4">
          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or rank..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([status, count]) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter(status)}
                  className="capitalize"
                >
                  {status === 'on_leave' ? 'On Leave' : 'All'} ({count})
                </Button>
              ))}
            </div>
          </div>
          
          {/* Seafarers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSeafarers.length > 0 ? (
              filteredSeafarers.map((seafarer) => (
                <Card key={seafarer.id} className="transition-smooth hover:shadow-lg">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}
                          </CardTitle>
                          <p className="text-sm text-muted-foreground">
                            {seafarer.employment.rank}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <FileCheck className="w-4 h-4 mr-2" />
                            View Certificates
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Briefcase className="w-4 h-4 mr-2" />
                            Assign to Vessel
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Badge className={getStatusColor(seafarer.employment.status)}>
                        {seafarer.employment.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {seafarer.personalInfo.nationality}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      {seafarer.personalInfo.contact?.email && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Mail className="w-4 h-4" />
                          <span className="truncate">{seafarer.personalInfo.contact.email}</span>
                        </div>
                      )}
                      {seafarer.personalInfo.contact?.phone && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Phone className="w-4 h-4" />
                          <span>{seafarer.personalInfo.contact.phone}</span>
                        </div>
                      )}
                      {seafarer.employment.currentVesselName && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Ship className="w-4 h-4" />
                          <span>{seafarer.employment.currentVesselName}</span>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Basic Wage</span>
                        <span>${seafarer.employment.baseWage?.toLocaleString()} {seafarer.employment.wageCurrency}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center py-12 border rounded-lg">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No seafarers found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start by adding your first seafarer to the system'}
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="ocean-gradient shadow-ocean"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Seafarer
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Placeholder for other tabs */}
        <TabsContent value="assignments" className="text-center py-12">
          <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Crew Assignments</h3>
          <p className="text-muted-foreground mb-4">
            Manage crew assignments to vessels with rotation schedules
          </p>
          <Button disabled>Coming Soon</Button>
        </TabsContent>
        
        <TabsContent value="certificates" className="text-center py-12">
          <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Certificates</h3>
          <p className="text-muted-foreground mb-4">
            Track and manage seafarer certificates and documents
          </p>
          <Button disabled>Coming Soon</Button>
        </TabsContent>
        
        <TabsContent value="payroll" className="text-center py-12">
          <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Payroll</h3>
          <p className="text-muted-foreground mb-4">
            Process and manage seafarer payroll and payments
          </p>
          <Button disabled>Coming Soon</Button>
        </TabsContent>
      </Tabs>
      
      {/* Add/Edit Seafarer Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedSeafarer ? 'Edit Seafarer' : 'Add New Seafarer'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="John" />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Doe" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rank">Rank</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rank" />
                  </SelectTrigger>
                  <SelectContent>
                    {RANKS.map(rank => (
                      <SelectItem key={rank} value={rank}>{rank}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select defaultValue="on_leave">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="onboard">Onboard</SelectItem>
                    <SelectItem value="on_leave">On Leave</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@example.com" />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input id="nationality" placeholder="Nationality" />
              </div>
              <div>
                <Label htmlFor="baseWage">Base Wage</Label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                    $
                  </span>
                  <Input 
                    id="baseWage" 
                    type="number" 
                    placeholder="0.00" 
                    className="rounded-l-none"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button 
              className="ocean-gradient shadow-ocean"
              onClick={() => {
                // Handle form submission
                setShowAddDialog(false);
                toast({
                  title: 'Success',
                  description: selectedSeafarer 
                    ? 'Seafarer updated successfully' 
                    : 'Seafarer added successfully'
                });
              }}
            >
              {selectedSeafarer ? 'Update' : 'Add'} Seafarer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Assignment Dialog */}
      <Dialog open={showAssignmentDialog} onOpenChange={(open) => {
        setShowAssignmentDialog(open);
        if (!open) {
          setSelectedAssignment(null);
          setAssignmentFormData(null);
        }
      }}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment ? 'Edit Assignment' : 'Add New Assignment'}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <AssignmentForm 
              onSubmit={handleAddAssignment} 
              onCancel={() => {
                setShowAssignmentDialog(false);
                setSelectedAssignment(null);
                setAssignmentFormData(null);
              }}
              vessels={vessels}
              ranks={ranks}
              initialData={selectedAssignment || assignmentFormData}
              seafarer={selectedSeafarer}
              onDataChange={setAssignmentFormData}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Payroll Dialog */}
      <Dialog open={showPayrollDialog} onOpenChange={(open) => {
        setShowPayrollDialog(open);
        if (!open) {
          setSelectedPayroll(null);
          setPayrollFormData(null);
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedPayroll ? 'Edit Payroll' : 'Create Payroll'}
              {selectedSeafarer && (
                <p className="text-sm font-normal text-muted-foreground mt-1">
                  {selectedSeafarer.personalInfo?.firstName} {selectedSeafarer.personalInfo?.lastName}
                </p>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <PayrollForm 
              onSubmit={handleAddPayroll} 
              onCancel={() => {
                setShowPayrollDialog(false);
                setSelectedPayroll(null);
                setPayrollFormData(null);
              }}
              vessels={vessels}
              initialData={selectedPayroll || payrollFormData}
              seafarer={selectedSeafarer}
              onDataChange={setPayrollFormData}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
