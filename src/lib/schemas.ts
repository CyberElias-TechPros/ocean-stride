import { z } from 'zod';

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  country: z.string().min(1, 'Country is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
});

export const ContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  website: z.string().url('Invalid URL').optional(),
});

export const CompanySettingsSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  fiscalYearStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
});

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Company name is required'),
  code: z.string().min(1, 'Company code is required'),
  address: AddressSchema,
  contact: ContactSchema,
  settings: CompanySettingsSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  passportNumber: z.string().min(1, 'Passport number is required'),
  seamanBook: z.string().min(1, 'Seaman book number is required'),
});

export const CertificateSchema = z.object({
  id: z.string().uuid(),
  type: z.string().min(1, 'Certificate type is required'),
  number: z.string().min(1, 'Certificate number is required'),
  issueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  issuingAuthority: z.string().min(1, 'Issuing authority is required'),
  status: z.enum(['valid', 'expiring', 'expired']),
});

export const EmploymentSchema = z.object({
  status: z.enum(['active', 'available', 'onboard', 'leave', 'inactive']),
  currentVessel: z.string().optional(),
  signOnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  signOffDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  contractEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const FinancialSchema = z.object({
  basicWage: z.number().min(0, 'Basic wage cannot be negative'),
  currency: z.string().min(1, 'Currency is required'),
  bankAccount: z.object({
    accountNumber: z.string().min(1, 'Account number is required'),
    bankName: z.string().min(1, 'Bank name is required'),
    swiftCode: z.string().min(1, 'SWIFT code is required'),
  }).optional(),
  taxId: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
});

export const SeafarerSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  personalInfo: PersonalInfoSchema,
  qualifications: z.object({
    rank: z.string().min(1, 'Rank is required'),
    certificates: z.array(CertificateSchema),
  }),
  employment: EmploymentSchema,
  financial: FinancialSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VesselSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1, 'Vessel name is required'),
  imoNumber: z.string().min(1, 'IMO number is required'),
  flag: z.string().min(1, 'Flag is required'),
  type: z.string().min(1, 'Vessel type is required'),
  yearBuilt: z.number().min(1900).max(new Date().getFullYear() + 1),
  grossTonnage: z.number().min(0),
  netTonnage: z.number().min(0),
  lengthOverall: z.number().min(0),
  beam: z.number().min(0),
  draft: z.number().min(0),
  callSign: z.string().optional(),
  mmsi: z.string().optional(),
  classificationSociety: z.string().optional(),
  portOfRegistry: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CrewAssignmentSchema = z.object({
  id: z.string().uuid(),
  seafarerId: z.string().uuid(),
  vesselId: z.string().uuid(),
  rank: z.string().min(1, 'Rank is required'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['active', 'completed', 'cancelled']),
  signOnPort: z.string().optional(),
  signOffPort: z.string().optional(),
  contractDetails: z.record(z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PayrollRecordSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  seafarerId: z.string().uuid(),
  period: z.object({
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  earnings: z.object({
    basicWage: z.number().min(0),
    overtime: z.number().min(0),
    leavePay: z.number().min(0),
    bonus: z.number().min(0),
    other: z.number().min(0),
  }),
  deductions: z.object({
    tax: z.number().min(0),
    socialSecurity: z.number().min(0),
    insurance: z.number().min(0),
    unionDues: z.number().min(0),
    other: z.number().min(0),
  }),
  netPay: z.number(),
  currency: z.string().min(1, 'Currency is required'),
  paymentMethod: z.enum(['bank', 'cash', 'other']),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  status: z.enum(['draft', 'approved', 'paid', 'cancelled']),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

// Type exports
export type Address = z.infer<typeof AddressSchema>;
export type Contact = z.infer<typeof ContactSchema>;
export type CompanySettings = z.infer<typeof CompanySettingsSchema>;
export type Company = z.infer<typeof CompanySchema>;
export type PersonalInfo = z.infer<typeof PersonalInfoSchema>;
export type Certificate = z.infer<typeof CertificateSchema>;
export type Employment = z.infer<typeof EmploymentSchema>;
export type Financial = z.infer<typeof FinancialSchema>;
export type Seafarer = z.infer<typeof SeafarerSchema>;
export type Vessel = z.infer<typeof VesselSchema>;
export type CrewAssignment = z.infer<typeof CrewAssignmentSchema>;
export type PayrollRecord = z.infer<typeof PayrollRecordSchema>;
