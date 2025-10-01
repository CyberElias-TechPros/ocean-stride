import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { personnelApi } from '@/lib/api/personnel.api';
import type {
  Assignment,
  Payroll,
  SeafarerWithDetails,
  Vessel,
  BaseEntity
} from '@/types';
import type { Rank } from '@/lib/schemas_v2';

type PersonnelState = {
  // Data
  seafarers: SeafarerWithDetails[];
  vessels: (Vessel & BaseEntity)[];
  ranks: Rank[];
  assignments: Assignment[];
  payrolls: Payroll[];
  
  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: string | null;
  
  // Selected items
  selectedSeafarer: SeafarerWithDetails | null;
  selectedAssignment: Assignment | null;
  selectedPayroll: Payroll | null;
};

type UsePersonnelManagementProps = {
  companyId: string;
  userId: string;
};

export function usePersonnelManagement({ companyId, userId }: UsePersonnelManagementProps) {
  const { toast } = useToast();
  
  const [state, setState] = useState<PersonnelState>({
    seafarers: [],
    vessels: [],
    ranks: [],
    assignments: [],
    payrolls: [],
    isLoading: true,
    isError: false,
    error: null,
    selectedSeafarer: null,
    selectedAssignment: null,
    selectedPayroll: null,
  });

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    if (!companyId) return;
    
    try {
      setState(prev => ({ ...prev, isLoading: true, isError: false, error: null }));
      
      // Fetch all data in parallel
      const [ranks, assignments, payrolls] = await Promise.all([
        personnelApi.getRanks(),
        personnelApi.getAssignments(),
        personnelApi.getPayrolls(),
      ]);
      
      // TODO: Fetch seafarers and vessels from their respective APIs
      const seafarers: SeafarerWithDetails[] = [];
      const vessels: (Vessel & BaseEntity)[] = [];
      
      setState(prev => ({
        ...prev,
        seafarers,
        vessels,
        ranks,
        assignments: assignments as Assignment[],
        payrolls: payrolls as Payroll[],
        isLoading: false,
      }));
      
    } catch (error) {
      console.error('Error fetching personnel data:', error);
      setState(prev => ({
        ...prev,
        isError: true,
        error: error instanceof Error ? error.message : 'Failed to fetch data',
        isLoading: false,
      }));
      
      toast({
        title: 'Error',
        description: 'Failed to load personnel data',
        variant: 'destructive',
      });
    }
  }, [companyId, toast]);

  // Initial data fetch
  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle assignment creation
  const createAssignment = async (data: Omit<Assignment, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const newAssignment = await personnelApi.createAssignment({
        ...data,
        companyId,
      }, userId);
      
      // Update local state
      setState(prev => ({
        ...prev,
        assignments: [...prev.assignments, newAssignment as Assignment],
        selectedAssignment: newAssignment as Assignment,
        isLoading: false,
      }));
      
      toast({
        title: 'Success',
        description: 'Assignment created successfully',
        variant: 'default',
      });
      
      return newAssignment;
      
    } catch (error) {
      console.error('Error creating assignment:', error);
      setState(prev => ({
        ...prev,
        isError: true,
        error: error instanceof Error ? error.message : 'Failed to create assignment',
        isLoading: false,
      }));
      
      toast({
        title: 'Error',
        description: 'Failed to create assignment',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  // Handle payroll creation
  const createPayroll = async (data: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>) => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const { assignmentId, ...restData } = data;
      const payrollData = {
        ...restData,
        companyId,
      } as any;
      if (assignmentId) {
        payrollData.assignmentId = assignmentId;
      }
      const newPayroll = await personnelApi.createPayroll(payrollData, userId);
      
      // Update local state
      setState(prev => ({
        ...prev,
        payrolls: [...prev.payrolls, newPayroll as Payroll],
        selectedPayroll: newPayroll as Payroll,
        isLoading: false,
      }));
      
      toast({
        title: 'Success',
        description: 'Payroll created successfully',
        variant: 'default',
      });
      
      return newPayroll;
      
    } catch (error) {
      console.error('Error creating payroll:', error);
      setState(prev => ({
        ...prev,
        isError: true,
        error: error instanceof Error ? error.message : 'Failed to create payroll',
        isLoading: false,
      }));
      
      toast({
        title: 'Error',
        description: 'Failed to create payroll',
        variant: 'destructive',
      });
      
      throw error;
    }
  };

  // Update selected seafarer
  const selectSeafarer = (seafarer: SeafarerWithDetails | null) => {
    setState(prev => ({
      ...prev,
      selectedSeafarer: seafarer,
      selectedAssignment: null,
      selectedPayroll: null,
    }));
  };

  // Update selected assignment
  const selectAssignment = (assignment: Assignment | null) => {
    setState(prev => ({
      ...prev,
      selectedAssignment: assignment,
      selectedPayroll: null,
    }));
  };

  // Update selected payroll
  const selectPayroll = (payroll: Payroll | null) => {
    setState(prev => ({
      ...prev,
      selectedPayroll: payroll,
    }));
  };

  // Refresh all data
  const refresh = () => {
    return fetchAllData();
  };

  return {
    // State
    ...state,
    
    // Actions
    createAssignment,
    createPayroll,
    selectSeafarer,
    selectAssignment,
    selectPayroll,
    refresh,
  };
}
