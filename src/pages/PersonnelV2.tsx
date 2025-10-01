import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';

// Icons
import {
  MoreHorizontal,
  Plus,
  Search,
  User,
  Briefcase,
  FileText,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Users,
  Mail,
  Phone,
  Edit,
  Trash2,
  Ship,
  Download,
  FileCheck,
  Wallet
} from 'lucide-react';

// Context & Hooks
import { useCompany } from '@/context/CompanyContext';
import { usePersonnel } from '@/context/PersonnelContext';
import { useNotifications } from '@/hooks/useNotifications';

// Database
import { db } from '@/lib/database';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas_v2';

// Types & Schemas
import type {
  CrewAssignment as Assignment,
  Rank,
  Payroll,
  AssignmentStatus,
  PayrollStatus,
  PayrollItem,
  Seafarer,
  SeafarerWithDetails,
  Vessel,
  BaseEntity,
  Certificate
} from '@/types';

// Utils & Constants
import {
  assignmentStatusOptions,
  payrollStatusOptions,
  formatCurrency,
  formatDate,
  formatDateTime,
  AssignmentFormData,
  PayrollFormData,
  assignmentFormSchema,
  payrollFormSchema,
  prepareAssignmentForSubmission,
  preparePayrollForSubmission,
  defaultAssignmentFormData,
  defaultPayrollFormData
} from '@/lib/utils/formUtils';

// Export utility
import { exportToCSV } from '@/lib/utils/exportUtils';

// Components
import { AssignmentForm } from '@/components/assignment/AssignmentForm';
import { PayrollForm } from '@/components/payroll/PayrollForm';
import { CertificateForm } from '@/components/certificate/CertificateForm';

// Type definitions for the component props and state
type PersonnelV2Props = {
  // Add any props if needed
};

type PersonnelV2State = {
  searchQuery: string;
  statusFilter: string;
  activeTab: string;
  showAssignmentDialog: boolean;
  showPayrollDialog: boolean;
  assignmentFormData: AssignmentFormData | null;
  payrollFormData: PayrollFormData | null;
  selectedSeafarer: SeafarerWithDetails | null;
  selectedAssignment: Assignment | null;
  selectedPayroll: Payroll | null;
};

// Status badge component for assignments
const AssignmentStatusBadge = ({ status }: { status: AssignmentStatus }) => {
  const statusMap = {
    draft: { label: 'Draft', variant: 'outline' as const, icon: <FileText className="h-4 w-4" /> },
    scheduled: { label: 'Scheduled', variant: 'outline' as const, icon: <FileText className="h-4 w-4" /> },
    pending_approval: { label: 'Pending Approval', variant: 'secondary' as const, icon: <Clock className="h-4 w-4" /> },
    approved: { label: 'Approved', variant: 'secondary' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    active: { label: 'Active', variant: 'default' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    completed: { label: 'Completed', variant: 'default' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" /> },
    terminated: { label: 'Terminated', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" /> },
  };

  const statusConfig = statusMap[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
      {statusConfig.icon}
      {statusConfig.label}
    </Badge>
  );
};

// Status badge component for payrolls
const PayrollStatusBadge = ({ status }: { status: PayrollStatus }) => {
  const statusMap = {
    draft: { label: 'Draft', variant: 'outline' as const, icon: <FileText className="h-4 w-4" /> },
    pending_approval: { label: 'Pending Approval', variant: 'secondary' as const, icon: <Clock className="h-4 w-4" /> },
    approved: { label: 'Approved', variant: 'secondary' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    paid: { label: 'Paid', variant: 'default' as const, icon: <CheckCircle2 className="h-4 w-4" /> },
    cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: <XCircle className="h-4 w-4" /> },
    failed: { label: 'Failed', variant: 'destructive' as const, icon: <AlertCircle className="h-4 w-4" /> },
  };

  const statusConfig = statusMap[status] || { label: status, variant: 'outline' as const };

  return (
    <Badge variant={statusConfig.variant} className="flex items-center gap-1">
      {statusConfig.icon}
      {statusConfig.label}
    </Badge>
  );
};

type AssignmentWithDetails = Assignment & BaseEntity & {
  seafarerDetails?: SeafarerWithDetails | null;
  vesselDetails?: (Vessel & BaseEntity) | null;
  rankDetails?: Rank | null;
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
  documents?: string[];
  isActive?: boolean;
  signedBySeafarer?: boolean;
  signedByCompany?: boolean;
  createdBy?: string;
  updatedBy?: string;
};

type PayrollWithDetails = Payroll & BaseEntity & {
  seafarerDetails?: SeafarerWithDetails | null;
  vesselDetails?: (Vessel & BaseEntity) | null;
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
  createdBy?: string;
  updatedBy?: string;
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
  const [vessels, setVessels] = useState<(Vessel & BaseEntity)[]>([]);
  const [ranks, setRanks] = useState<Rank[]>([]);
  const [assignments, setAssignments] = useState<AssignmentWithDetails[]>([]);
  const [payrolls, setPayrolls] = useState<PayrollWithDetails[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]); // TODO: define Certificate type
  
  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAssignmentDialog, setShowAssignmentDialog] = useState(false);
  const [showPayrollDialog, setShowPayrollDialog] = useState(false);
  const [showCertificateDialog, setShowCertificateDialog] = useState(false);
  const [selectedSeafarer, setSelectedSeafarer] = useState<SeafarerWithDetails | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithDetails | null>(null);
  const [selectedPayroll, setSelectedPayroll] = useState<PayrollWithDetails | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState<any>(null);
  const [assignmentFormData, setAssignmentFormData] = useState<Partial<Assignment> | null>(null);
  const [payrollFormData, setPayrollFormData] = useState<Partial<Payroll> | null>(null);
  const [certificateFormData, setCertificateFormData] = useState<any>(null);
  const [seafarerFormData, setSeafarerFormData] = useState<any>({
    personalInfo: {
      firstName: '',
      lastName: '',
      nationality: '',
      contact: {
        email: '',
        phone: ''
      }
    },
    employment: {
      rank: '',
      status: 'on_leave',
      baseWage: 0,
      wageCurrency: 'USD'
    }
  });
  
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
          payrollsData,
          certificatesData
        ] = await Promise.all([
          db.getByIndex<Seafarer & BaseEntity>(STORE_NAMES.SEAFARERS, 'by_company', selectedCompany.id),
          db.getByIndex<Vessel & BaseEntity>(STORE_NAMES.VESSELS, 'by_company', selectedCompany.id),
          db.getByIndex<Rank>(STORE_NAMES.RANKS, 'by_company', selectedCompany.id),
          db.getByIndex<Assignment & BaseEntity>(STORE_NAMES.CREW_ASSIGNMENTS, 'by_company', selectedCompany.id),
          db.getByIndex<Payroll & BaseEntity>(STORE_NAMES.PAYROLLS, 'by_company', selectedCompany.id),
          db.getByIndex<Certificate & BaseEntity>(STORE_NAMES.CERTIFICATES, 'by_company', selectedCompany.id)
        ]);

        // Enrich assignments with related data
        const enrichedAssignments = assignmentsData.map(assignment => ({
          ...assignment,
          seafarerDetails: seafarersData.find(s => s.id === assignment.seafarerId),
          vesselDetails: vesselsData.find(v => v.id === assignment.vesselId),
          rankDetails: null
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
              rankDetails: null
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
            rankDetails: null,
            vesselDetails: activeAssignment
              ? vesselsData.find(v => v.id === activeAssignment.vesselId)
              : undefined,
            assignments: seafarerAssignments,
            payrolls: seafarerPayrolls,
            certificates: certificatesData.filter(c => c.seafarerId === seafarer.id)
          } as SeafarerWithDetails;
        });

        setSeafarers(enrichedSeafarers);
        setVessels(vesselsData as (Vessel & BaseEntity)[]);
        setRanks(ranksData);
        setAssignments(enrichedAssignments);
        setPayrolls(enrichedPayrolls);
        setCertificates(certificatesData);
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

  // Check for expiring certificates and add notifications
  useEffect(() => {
    if (!certificates.length) return;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    certificates.forEach(certificate => {
      const expiryDate = new Date(certificate.expiryDate);
      if (expiryDate <= thirtyDaysFromNow && expiryDate > now) {
        // Add notification
        // TODO: Use notification system
      }
    });
  }, [certificates]);
  
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

  const handleExportSeafarers = () => {
    try {
      const exportData = filteredSeafarers.map((seafarer) => ({
        'First Name': seafarer.personalInfo.firstName,
        'Last Name': seafarer.personalInfo.lastName,
        'Email': seafarer.personalInfo.contact?.email || '',
        'Phone': seafarer.personalInfo.contact?.phone || '',
        'Nationality': seafarer.personalInfo.nationality,
        'Rank': seafarer.employment.rank,
        'Status': seafarer.employment.status,
        'Base Wage': seafarer.employment.baseWage,
        'Currency': seafarer.employment.wageCurrency,
        'Joined Date': seafarer.employment.joinedDate,
        'Contract End Date': seafarer.employment.contractEndDate || '',
        'Current Vessel': seafarer.employment.currentVesselName || ''
      }));

      exportToCSV(exportData, undefined, `seafarers_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported ${filteredSeafarers.length} seafarers to CSV`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export seafarers data",
        variant: "destructive"
      });
    }
  };
  
  const handleAddAssignment = async (assignmentData: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'companyId'>) => {
    if (!selectedCompany || !selectedSeafarer) return;
    
    try {
      const now = new Date().toISOString();
      const newAssignment = await db.create<Assignment & BaseEntity>(STORE_NAMES.CREW_ASSIGNMENTS, {
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
      } as Assignment & BaseEntity);
      
      // Find the vessel and rank details
      const vesselDetails = vessels.find(v => v.id === assignmentData.vesselId) || null;
      const rankDetails = ranks.find(r => r.id === assignmentData.rankId) || null;
      
      // Create the enriched assignment with all required properties
      const enrichedAssignment: AssignmentWithDetails = {
        ...newAssignment,
        seafarerDetails: selectedSeafarer,
        vesselDetails,
        rankDetails,
        salary: assignmentData.salary || 0,
        currency: assignmentData.currency || 'USD',
        rotationType: assignmentData.rotationType || 'fixed_term',
        frequency: assignmentData.frequency || 'monthly',
        status: assignmentData.status || 'scheduled',
        startDate: assignmentData.startDate || now,
        endDate: assignmentData.endDate,
        documents: assignmentData.documents || [],
        isActive: assignmentData.status === 'active',
        signedBySeafarer: false,
        signedByCompany: false,
        createdBy: 'system',
        updatedBy: 'system'
      };
      
      // Update local state
      setAssignments(prev => [...prev, enrichedAssignment]);
      
      // If this is an active assignment, update the seafarer's current assignment
      if (newAssignment.status === 'active' && selectedSeafarer) {
        const updateData: Partial<Seafarer> = {
          employment: {
            ...selectedSeafarer.employment,
            currentAssignmentId: newAssignment.id,
            currentVesselId: newAssignment.vesselId,
            rank: rankDetails?.name || selectedSeafarer.employment?.rank || '',
            status: 'onboard',
            baseWage: assignmentData.salary,
            wageCurrency: assignmentData.currency
          },
          updatedAt: now
        };

        const updatedSeafarer = await db.update<Seafarer & BaseEntity>(
          STORE_NAMES.SEAFARERS, 
          selectedSeafarer.id,
          updateData
        );
        
        // Update the local seafarer state
        setSeafarers(prev => 
          prev.map(s => {
            if (s.id === selectedSeafarer.id) {
              const updatedSeafarerData: SeafarerWithDetails = {
                ...s,
                ...updatedSeafarer,
                currentAssignment: enrichedAssignment,
                vesselDetails,
                rankDetails,
                employment: {
                  ...s.employment,
                  ...updateData.employment,
                  currentVesselId: newAssignment.vesselId,
                  currentAssignmentId: newAssignment.id,
                  status: 'onboard'
                },
                updatedAt: now
              };
              return updatedSeafarerData;
            }
            return s;
          })
        );
      }
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
        variant: 'default'
      });
      
      // Reset form and close dialog
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
      
      const netPay = totalEarnings - totalDeductions;
      
      // Create the new payroll
      const newPayroll = await db.create<Payroll & BaseEntity>(STORE_NAMES.PAYROLLS, {
        ...payrollData,
        seafarerId: selectedSeafarer.id,
        companyId: selectedCompany.id,
        status: 'draft',
        totalEarnings,
        totalDeductions,
        netPay,
        items: items.map(item => ({
          ...item,
          amount: item.amount || 0,
          taxable: item.taxable !== undefined ? item.taxable : true
        })),
        documents: payrollData.documents || [],
        paymentMethod: payrollData.paymentMethod || 'bank_transfer',
        currency: payrollData.currency || 'USD',
        periodStart: payrollData.periodStart || now,
        periodEnd: payrollData.periodEnd || now,
        paymentDate: payrollData.paymentDate || now,
        basicSalary: payrollData.basicSalary || 0,
        createdAt: now,
        updatedAt: now,
        createdBy: 'system', // TODO: Replace with actual user ID
        updatedBy: 'system'  // TODO: Replace with actual user ID
      } as Payroll & BaseEntity);
      
      // Find the vessel details
      const vesselDetails = vessels.find(v => v.id === payrollData.vesselId) || null;
      
      // Create the enriched payroll with all required properties
      const enrichedPayroll: PayrollWithDetails = {
        ...newPayroll,
        seafarerDetails: selectedSeafarer,
        vesselDetails,
        status: 'draft',
        periodStart: payrollData.periodStart || now,
        periodEnd: payrollData.periodEnd || now,
        paymentDate: payrollData.paymentDate || now,
        basicSalary: payrollData.basicSalary || 0,
        items: newPayroll.items || [],
        totalEarnings,
        totalDeductions,
        netPay,
        currency: payrollData.currency || 'USD',
        paymentMethod: payrollData.paymentMethod || 'bank_transfer',
        documents: payrollData.documents || []
      };
      
      // Update local state
      setPayrolls(prev => [...prev, enrichedPayroll]);
      
      // Update seafarer's payrolls
      setSeafarers(prev => 
        prev.map(s => {
          if (s.id === selectedSeafarer.id) {
            const updatedSeafarer: SeafarerWithDetails = {
              ...s,
              payrolls: [...(s.payrolls || []), enrichedPayroll]
            };
            return updatedSeafarer;
          }
          return s;
        })
      );
      
      // Show success message
      toast({
        title: 'Success',
        description: 'Payroll created successfully',
        variant: 'default'
      });
      
      // Reset form and close dialog
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
          <Button variant="outline" onClick={handleExportSeafarers}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            className="ocean-gradient shadow-ocean"
            onClick={() => {
              setSelectedSeafarer(null);
              setSeafarerFormData({
                personalInfo: {
                  firstName: '',
                  lastName: '',
                  nationality: '',
                  contact: {
                    email: '',
                    phone: ''
                  }
                },
                employment: {
                  rank: '',
                  status: 'on_leave',
                  baseWage: 0,
                  wageCurrency: 'USD'
                }
              });
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
                <Card
                  key={seafarer.id}
                  className={`transition-smooth hover:shadow-lg cursor-pointer ${
                    selectedSeafarer?.id === seafarer.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedSeafarer(seafarer)}
                >
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
        
        {/* Assignments Tab */}
        <TabsContent value="assignments" className="space-y-4">
          {!selectedSeafarer ? (
            <div className="text-center py-12">
              <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Crew Assignments</h3>
              <p className="text-muted-foreground mb-4">
                Please select a seafarer from the Seafarers tab to view their assignments
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Assignments for {selectedSeafarer.personalInfo.firstName} {selectedSeafarer.personalInfo.lastName}</h3>
                  <p className="text-muted-foreground">Manage crew assignments to vessels</p>
                </div>
                <Button
                  className="ocean-gradient shadow-ocean"
                  onClick={() => {
                    setSelectedAssignment(null);
                    setAssignmentFormData(null);
                    setShowAssignmentDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Assignment
                </Button>
              </div>

              <div className="space-y-4">
                {selectedSeafarer.assignments?.length ? (
                  selectedSeafarer.assignments.map((assignment) => (
                    <Card key={assignment.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{assignment.vesselDetails?.name || 'Unknown Vessel'}</h4>
                            <AssignmentStatusBadge status={assignment.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(assignment.startDate)} - {assignment.endDate ? formatDate(assignment.endDate) : 'Ongoing'}
                          </p>
                          <p className="text-sm">Salary: {formatCurrency(assignment.salary, assignment.currency)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedAssignment(assignment);
                                setShowAssignmentDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteAssignment(assignment.id)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No assignments found</p>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
        
        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          {!selectedSeafarer ? (
            <div className="text-center py-12">
              <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Certificates</h3>
              <p className="text-muted-foreground mb-4">
                Please select a seafarer from the Seafarers tab to view their certificates
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Certificates for {selectedSeafarer.personalInfo.firstName} {selectedSeafarer.personalInfo.lastName}</h3>
                  <p className="text-muted-foreground">Track and manage seafarer certificates</p>
                </div>
                <Button
                  className="ocean-gradient shadow-ocean"
                  onClick={() => {
                    setSelectedCertificate(null);
                    setCertificateFormData(null);
                    setShowCertificateDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certificate
                </Button>
              </div>

              <div className="space-y-4">
                {selectedSeafarer.certificates?.length ? (
                  selectedSeafarer.certificates.map((certificate) => {
                    const expiryDate = new Date(certificate.expiryDate);
                    const now = new Date();
                    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                    const isExpired = daysUntilExpiry <= 0;

                    return (
                      <Card key={certificate.id} className={`p-4 ${isExpired ? 'border-destructive' : isExpiringSoon ? 'border-yellow-500' : ''}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{certificate.type}</h4>
                              <Badge variant={certificate.status === 'valid' ? 'default' : certificate.status === 'expired' ? 'destructive' : 'secondary'}>
                                {certificate.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">Number: {certificate.number}</p>
                            <p className="text-sm text-muted-foreground">Issued by: {certificate.issuedBy}</p>
                            <p className="text-sm">Expiry: {formatDate(certificate.expiryDate)}</p>
                            {isExpiringSoon && (
                              <p className="text-sm text-yellow-600">Expires in {daysUntilExpiry} days</p>
                            )}
                            {isExpired && (
                              <p className="text-sm text-destructive">Expired {Math.abs(daysUntilExpiry)} days ago</p>
                            )}
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
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <FileCheck className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No certificates found</p>
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>
        
        {/* Payroll Tab */}
        <TabsContent value="payroll" className="space-y-4">
          {!selectedSeafarer ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payroll</h3>
              <p className="text-muted-foreground mb-4">
                Please select a seafarer from the Seafarers tab to view their payroll
              </p>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold">Payroll for {selectedSeafarer.personalInfo.firstName} {selectedSeafarer.personalInfo.lastName}</h3>
                  <p className="text-muted-foreground">Process and manage seafarer payroll</p>
                </div>
                <Button
                  className="ocean-gradient shadow-ocean"
                  onClick={() => {
                    setSelectedPayroll(null);
                    setPayrollFormData(null);
                    setShowPayrollDialog(true);
                  }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Payroll
                </Button>
              </div>

              <div className="space-y-4">
                {selectedSeafarer.payrolls?.length ? (
                  selectedSeafarer.payrolls.map((payroll) => (
                    <Card key={payroll.id} className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{payroll.vesselDetails?.name || 'Unknown Vessel'}</h4>
                            <PayrollStatusBadge status={payroll.status} />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Period: {formatDate(payroll.periodStart)} - {formatDate(payroll.periodEnd)}
                          </p>
                          <p className="text-sm">Net Pay: {formatCurrency(payroll.netPay, payroll.currency)}</p>
                          <p className="text-sm text-muted-foreground">Payment Date: {formatDate(payroll.paymentDate)}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedPayroll(payroll);
                                setShowPayrollDialog(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </Card>
                  ))
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <Wallet className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-muted-foreground">No payroll records found</p>
                  </div>
                )}
              </div>
            </>
          )}
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
                <Input
                  id="firstName"
                  placeholder="John"
                  value={seafarerFormData.personalInfo?.firstName || ''}
                  onChange={(e) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, firstName: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={seafarerFormData.personalInfo?.lastName || ''}
                  onChange={(e) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, lastName: e.target.value }
                  }))}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rank">Rank</Label>
                <Select
                  value={seafarerFormData.employment?.rank || ''}
                  onValueChange={(value) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    employment: { ...prev.employment, rank: value }
                  }))}
                >
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
                <Select
                  value={seafarerFormData.employment?.status || 'on_leave'}
                  onValueChange={(value) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    employment: { ...prev.employment, status: value }
                  }))}
                >
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
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@example.com"
                  value={seafarerFormData.personalInfo?.contact?.email || ''}
                  onChange={(e) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    personalInfo: {
                      ...prev.personalInfo,
                      contact: { ...prev.personalInfo.contact, email: e.target.value }
                    }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  placeholder="+1 (555) 000-0000"
                  value={seafarerFormData.personalInfo?.contact?.phone || ''}
                  onChange={(e) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    personalInfo: {
                      ...prev.personalInfo,
                      contact: { ...prev.personalInfo.contact, phone: e.target.value }
                    }
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nationality">Nationality</Label>
                <Input
                  id="nationality"
                  placeholder="Nationality"
                  value={seafarerFormData.personalInfo?.nationality || ''}
                  onChange={(e) => setSeafarerFormData((prev: any) => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, nationality: e.target.value }
                  }))}
                />
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
                    value={seafarerFormData.employment?.baseWage || ''}
                    onChange={(e) => setSeafarerFormData((prev: any) => ({
                      ...prev,
                      employment: { ...prev.employment, baseWage: Number(e.target.value) }
                    }))}
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
                handleAddSeafarer(seafarerFormData);
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
