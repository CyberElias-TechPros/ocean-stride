import { z } from 'zod';
import { 
  assignmentSchema, 
  payrollSchema, 
  rankSchema,
  Assignment,
  Payroll,
  Rank,
  AssignmentStatus,
  PayrollStatus,
  PaymentMethod,
} from '@/lib/validation/personnel.schemas';

// Type for form data that can be partially filled
type PartialFormData<T> = {
  [K in keyof T]?: T[K] | null | undefined;
};

// Assignment form data type
export type AssignmentFormData = PartialFormData<Omit<Assignment, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'companyId'>>;

// Payroll form data type
export type PayrollFormData = PartialFormData<Omit<Payroll, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy' | 'companyId'>>;

// Rank form data type
export type RankFormData = PartialFormData<Omit<Rank, 
  'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'updatedBy'>>;

// Default form values
export const defaultAssignmentFormData: AssignmentFormData = {
  seafarerId: '',
  vesselId: '',
  rankId: '',
  status: 'draft',
  startDate: new Date().toISOString(),
  endDate: undefined,
  salary: 0,
  currency: 'USD',
  rotationType: 'fixed_term',
  frequency: 'monthly',
  customFrequency: undefined,
  notes: '',
  documents: [],
  isActive: false,
  signedBySeafarer: false,
  signedByCompany: false,
};

export const defaultPayrollFormData: PayrollFormData = {
  seafarerId: '',
  vesselId: '',
  assignmentId: '',
  status: 'draft',
  periodStart: new Date().toISOString(),
  periodEnd: new Date().toISOString(),
  paymentDate: new Date().toISOString(),
  basicSalary: 0,
  items: [],
  totalEarnings: 0,
  totalDeductions: 0,
  netPay: 0,
  currency: 'USD',
  paymentMethod: 'bank_transfer',
  paymentReference: '',
  notes: '',
  documents: [],
};

export const defaultRankFormData: RankFormData = {
  name: '',
  description: '',
  department: 'deck',
  level: 1,
  baseSalary: 0,
  currency: 'USD',
  isOfficer: false,
  requiredCertificates: [],
};

// Validation schemas for forms
export const assignmentFormSchema = assignmentSchema.omit({ 
  id: true, 
  companyId: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const payrollFormSchema = payrollSchema.omit({ 
  id: true, 
  companyId: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

export const rankFormSchema = rankSchema.omit({ 
  id: true, 
  companyId: true, 
  createdAt: true, 
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
});

// Helper functions for form handling
export function sanitizeFormData<T>(data: PartialFormData<T>): T {
  const sanitized: any = {};
  
  for (const key in data) {
    const value = data[key as keyof typeof data];
    
    // Skip null or undefined values
    if (value === null || value === undefined) {
      continue;
    }
    
    // Handle empty strings for required fields
    if (typeof value === 'string' && value.trim() === '') {
      continue;
    }
    
    // Handle empty arrays
    if (Array.isArray(value) && value.length === 0) {
      continue;
    }
    
    // Handle empty objects
    if (typeof value === 'object' && value !== null && Object.keys(value).length === 0) {
      continue;
    }
    
    sanitized[key] = value;
  }
  
  return sanitized as T;
}

export function prepareAssignmentForSubmission(
  data: AssignmentFormData,
  companyId: string,
  userId: string
): Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'> {
  const sanitized = sanitizeFormData(data);
  
  return {
    ...sanitized,
    companyId,
    createdBy: userId,
    updatedBy: userId,
    isActive: sanitized.status === 'active',
    documents: sanitized.documents || [],
    customFrequency: sanitized.customFrequency || undefined,
  } as Omit<Assignment, 'id' | 'createdAt' | 'updatedAt'>;
}

export function preparePayrollForSubmission(
  data: PayrollFormData,
  companyId: string,
  userId: string
): Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'> {
  const sanitized = sanitizeFormData(data);
  
  return {
    ...sanitized,
    companyId,
    createdBy: userId,
    updatedBy: userId,
    items: sanitized.items || [],
    documents: sanitized.documents || [],
    paymentMethod: sanitized.paymentMethod || 'bank_transfer',
    currency: sanitized.currency || 'USD',
  } as Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'>;
}

export function prepareRankForSubmission(
  data: RankFormData,
  companyId: string,
  userId: string
): Omit<Rank, 'id' | 'createdAt' | 'updatedAt'> {
  const sanitized = sanitizeFormData(data);
  
  return {
    ...sanitized,
    companyId,
    createdBy: userId,
    updatedBy: userId,
    requiredCertificates: sanitized.requiredCertificates || [],
  } as Omit<Rank, 'id' | 'createdAt' | 'updatedAt'>;
}

// Form field options
export const assignmentStatusOptions: { value: AssignmentStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'terminated', label: 'Terminated' },
];

export const payrollStatusOptions: { value: PayrollStatus; label: string }[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_approval', label: 'Pending Approval' },
  { value: 'approved', label: 'Approved' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

export const paymentMethodOptions: { value: PaymentMethod; label: string }[] = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'other', label: 'Other' },
];

export const departmentOptions = [
  { value: 'deck', label: 'Deck' },
  { value: 'engine', label: 'Engine' },
  { value: 'catering', label: 'Catering' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'other', label: 'Other' },
];

export const rotationTypeOptions = [
  { value: 'fixed_term', label: 'Fixed Term' },
  { value: 'rotation', label: 'Rotation' },
];

export const frequencyOptions = [
  { value: 'single', label: 'Single' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'custom', label: 'Custom' },
];

// Helper functions for form field formatting
export function formatCurrency(value: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Validation helpers
export function validateForm<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { isValid: boolean; errors: Record<string, string> } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { isValid: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  
  for (const error of result.error.errors) {
    const path = error.path.join('.');
    errors[path] = error.message;
  }
  
  return { isValid: false, errors };
}
