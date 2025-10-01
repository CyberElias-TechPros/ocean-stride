import { z } from 'zod';
import { STORE_NAMES } from '@/lib/schemas_v2';

// Base schema for common fields
export const baseEntitySchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  createdBy: z.string().min(1),
  updatedBy: z.string().min(1),
});

// Rank schema
export const rankSchema = baseEntitySchema.extend({
  name: z.string().min(2, 'Rank name must be at least 2 characters'),
  description: z.string().optional(),
  department: z.enum(['deck', 'engine', 'catering', 'electrical', 'other']),
  level: z.number().int().min(1, 'Level must be at least 1'),
  baseSalary: z.number().min(0, 'Base salary cannot be negative'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  isOfficer: z.boolean(),
  requiredCertificates: z.array(z.string().uuid()),
});

// Assignment status enum
export const assignmentStatusEnum = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'active',
  'completed',
  'cancelled',
  'terminated',
]);

// Assignment schema
export const assignmentSchema = baseEntitySchema.extend({
  seafarerId: z.string().uuid(),
  vesselId: z.string().uuid(),
  rankId: z.string().uuid(),
  status: assignmentStatusEnum,
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  salary: z.number().min(0, 'Salary cannot be negative'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  rotationType: z.enum(['fixed_term', 'rotation']),
  frequency: z.enum(['single', 'weekly', 'biweekly', 'monthly', 'custom']),
  customFrequency: z.object({
    daysOn: z.number().int().min(1, 'Days on must be at least 1'),
    daysOff: z.number().int().min(0, 'Days off cannot be negative'),
  }).optional(),
  notes: z.string().optional(),
  documents: z.array(z.string().url('Document must be a valid URL')).default([]),
  isActive: z.boolean(),
  signedBySeafarer: z.boolean(),
  signedByCompany: z.boolean(),
});

// Payroll item type
export const payrollItemTypeEnum = z.enum([
  'salary',
  'overtime',
  'bonus',
  'allowance',
  'reimbursement',
  'deduction',
  'tax',
  'other',
]);

// Payroll item schema
export const payrollItemSchema = z.object({
  id: z.string().uuid(),
  type: payrollItemTypeEnum,
  description: z.string().min(1, 'Description is required'),
  amount: z.number().min(0, 'Amount cannot be negative'),
  taxable: z.boolean().default(true),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  quantity: z.number().min(1).default(1),
  rate: z.number().min(0, 'Rate cannot be negative'),
  total: z.number().min(0, 'Total cannot be negative'),
});

// Payroll status enum
export const payrollStatusEnum = z.enum([
  'draft',
  'pending_approval',
  'approved',
  'paid',
  'cancelled',
  'failed',
]);

// Payment method enum
export const paymentMethodEnum = z.enum([
  'bank_transfer',
  'cash',
  'check',
  'other',
]);

// Payroll schema
export const payrollSchema = baseEntitySchema.extend({
  seafarerId: z.string().uuid(),
  vesselId: z.string().uuid(),
  assignmentId: z.string().uuid(),
  status: payrollStatusEnum,
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  paymentDate: z.string().datetime(),
  basicSalary: z.number().min(0, 'Basic salary cannot be negative'),
  items: z.array(payrollItemSchema),
  totalEarnings: z.number().min(0, 'Total earnings cannot be negative'),
  totalDeductions: z.number().min(0, 'Total deductions cannot be negative'),
  netPay: z.number(),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  paymentMethod: paymentMethodEnum,
  paymentReference: z.string().optional(),
  notes: z.string().optional(),
  documents: z.array(z.string().url('Document must be a valid URL')).default([]),
});

// Store name to schema mapping
export const storeSchemas = {
  [STORE_NAMES.RANKS]: rankSchema,
  [STORE_NAMES.CREW_ASSIGNMENTS]: assignmentSchema,
  [STORE_NAMES.PAYROLLS]: payrollSchema,
} as const;

// Type exports
export type BaseEntity = z.infer<typeof baseEntitySchema>;
export type Rank = z.infer<typeof rankSchema>;
export type AssignmentStatus = z.infer<typeof assignmentStatusEnum>;
export type Assignment = z.infer<typeof assignmentSchema>;
export type PayrollItemType = z.infer<typeof payrollItemTypeEnum>;
export type PayrollItem = z.infer<typeof payrollItemSchema>;
export type PayrollStatus = z.infer<typeof payrollStatusEnum>;
export type PaymentMethod = z.infer<typeof paymentMethodEnum>;
export type Payroll = z.infer<typeof payrollSchema>;
