import { z } from 'zod';

// Certificate Schema
export const certificateSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.string().min(1, "Certificate type is required"),
  number: z.string().min(1, "Certificate number is required"),
  issueDate: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  expiryDate: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  issuedBy: z.string().min(1, "Issuing authority is required"),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['valid', 'expired', 'expiring_soon', 'missing']).default('valid'),
  requiredForRanks: z.array(z.string()).default([])
});

export type Certificate = z.infer<typeof certificateSchema>;

// Rank Schema
export const rankSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Rank name is required"),
  department: z.enum(['deck', 'engine', 'catering', 'electrical', 'other']),
  level: z.number().int().positive("Level must be a positive number"),
  baseSalary: z.number().min(0, "Base salary cannot be negative"),
  currency: z.string().default('USD'),
  isOfficer: z.boolean().default(false),
  requiredCertificates: z.array(z.string()).default([]),
  description: z.string().optional(),
  companyId: z.string().optional()
});

export type Rank = z.infer<typeof rankSchema>;

// Payroll Settings Schema
export const payrollSettingsSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string(),
  overtimeRate: z.number().min(0).default(1.5),
  overtimeThreshold: z.number().min(0).default(40),
  bonusRates: z.record(z.number().min(0)).default({}),
  deductionRates: z.record(z.number().min(0)).default({}),
  taxSettings: z.object({
    taxRate: z.number().min(0).max(100).default(20),
    taxFreeAllowance: z.number().min(0).default(0),
    socialSecurityRate: z.number().min(0).max(100).default(5)
  }),
  pensionSettings: z.object({
    enabled: z.boolean().default(true),
    employeeContribution: z.number().min(0).max(100).default(5),
    employerContribution: z.number().min(0).max(100).default(10)
  }),
  paymentSchedule: z.enum(['weekly', 'bi_weekly', 'monthly']).default('monthly'),
  bankAccount: z.object({
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    swiftCode: z.string().optional(),
    iban: z.string().optional()
  }).optional()
});

export type PayrollSettings = z.infer<typeof payrollSettingsSchema>;

// Payroll Item Schema
export const payrollItemSchema = z.object({
  type: z.enum(['regular', 'overtime', 'bonus', 'allowance', 'deduction', 'tax', 'pension']),
  description: z.string(),
  amount: z.number(),
  rate: z.number().optional(),
  quantity: z.number().optional(),
  taxable: z.boolean().default(true)
});

export type PayrollItem = z.infer<typeof payrollItemSchema>;

// Payroll Schema
export const payrollSchema = z.object({
  id: z.string().uuid().optional(),
  seafarerId: z.string(),
  companyId: z.string(),
  vesselId: z.string().optional(),
  periodStart: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  periodEnd: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  items: z.array(payrollItemSchema),
  status: z.enum(['draft', 'pending', 'approved', 'paid', 'cancelled']).default('draft'),
  paymentDate: z.string().or(z.date()).transform(val => new Date(val).toISOString()).optional(),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'check']).default('bank_transfer'),
  notes: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export type Payroll = z.infer<typeof payrollSchema>;

// Crew Assignment Schema
export const crewAssignmentSchema = z.object({
  id: z.string().uuid().optional(),
  seafarerId: z.string(),
  vesselId: z.string(),
  companyId: z.string(),
  rankId: z.string(),
  startDate: z.string().or(z.date()).transform(val => new Date(val).toISOString()),
  endDate: z.string().or(z.date()).transform(val => new Date(val).toISOString()).optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
  salary: z.number().min(0, "Salary cannot be negative"),
  currency: z.string().default('USD'),
  rotationType: z.enum(['fixed', 'rotating']).default('fixed'),
  rotationDays: z.number().int().min(1).default(30),
  leaveDays: z.number().int().min(0).default(30),
  notes: z.string().optional()
});

export type CrewAssignment = z.infer<typeof crewAssignmentSchema>;

// Company Settings Schema
export const companySettingsSchema = z.object({
  id: z.string().uuid().optional(),
  companyId: z.string(),
  dateFormat: z.string().default('YYYY-MM-DD'),
  timezone: z.string().default('UTC'),
  currency: z.string().default('USD'),
  defaultVesselRotationDays: z.number().int().min(1).default(30),
  defaultLeaveDays: z.number().int().min(0).default(30),
  notificationSettings: z.object({
    certificateExpiryDays: z.number().int().min(1).default(30),
    contractExpiryDays: z.number().int().min(1).default(30),
    sendEmail: z.boolean().default(true),
    sendSMS: z.boolean().default(false)
  }),
  documentSettings: z.object({
    requiredCertificates: z.array(z.string()).default([]),
    documentExpiryWarningDays: z.number().int().min(1).default(60)
  })
});

export type CompanySettings = z.infer<typeof companySettingsSchema>;
