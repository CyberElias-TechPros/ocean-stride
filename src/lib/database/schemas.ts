import { z } from 'zod';

// Helper function to create a date string schema with format validation
export const dateStringSchema = () =>
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

export const AddressSchema = z.object({
  street: z.string().min(1, 'Street is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().optional(),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required'),
});

export const ContactSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  mobile: z.string().optional(),
  fax: z.string().optional(),
  website: z.string().url('Invalid URL').optional(),
});

export const CompanySettingsSchema = z.object({
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  dateFormat: z.string().default('YYYY-MM-DD'),
  timeFormat: z.string().default('HH:mm'),
  fiscalYearStart: dateStringSchema(),
  language: z.string().default('en'),
  theme: z.enum(['light', 'dark', 'system']).default('system'),
});

export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Company name is required'),
  code: z.string().min(1, 'Company code is required'),
  taxId: z.string().optional(),
  registrationNumber: z.string().optional(),
  vatNumber: z.string().optional(),
  address: AddressSchema,
  contact: ContactSchema,
  settings: CompanySettingsSchema,
  logo: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PersonalInfoSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  middleName: z.string().optional(),
  lastName: z.string().min(1, 'Last name is required'),
  dateOfBirth: dateStringSchema(),
  placeOfBirth: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']).optional(),
  nationality: z.string().min(1, 'Nationality is required'),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).optional(),
  bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
});

export const DocumentSchema = z.object({
  type: z.string().min(1, 'Document type is required'),
  number: z.string().min(1, 'Document number is required'),
  issueDate: dateStringSchema(),
  expiryDate: dateStringSchema(),
  issuingAuthority: z.string().optional(),
  issuingCountry: z.string().optional(),
  fileUrl: z.string().optional(),
  isVerified: z.boolean().default(false),
  notes: z.string().optional(),
});

export const CertificateSchema = DocumentSchema.extend({
  type: z.string().min(1, 'Certificate type is required'),
  rank: z.string().optional(),
  limitation: z.string().optional(),
});

export const EmploymentSchema = z.object({
  status: z.enum(['active', 'available', 'onboard', 'on_leave', 'inactive']),
  rank: z.string().min(1, 'Rank is required'),
  department: z.string().optional(),
  dateHired: dateStringSchema(),
  dateTerminated: dateStringSchema().optional(),
  terminationReason: z.string().optional(),
  employeeId: z.string().optional(),
  supervisor: z.string().optional(),
  baseLocation: z.string().optional(),
  employmentType: z.enum(['full_time', 'part_time', 'contract', 'temporary']).default('full_time'),
  notes: z.string().optional(),
});

export const EmergencyContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  relationship: z.string().min(1, 'Relationship is required'),
  phone: z.string().min(1, 'Phone number is required'),
  email: z.string().email('Invalid email address').optional(),
  address: z.string().optional(),
  isPrimary: z.boolean().default(false),
});

export const BankAccountSchema = z.object({
  accountNumber: z.string().min(1, 'Account number is required'),
  accountName: z.string().min(1, 'Account name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
  branch: z.string().optional(),
  swiftCode: z.string().optional(),
  iban: z.string().optional(),
  isPrimary: z.boolean().default(false),
  currency: z.string().min(1, 'Currency is required'),
});

export const FinancialSchema = z.object({
  basicWage: z.number().min(0, 'Basic wage cannot be negative'),
  currency: z.string().min(1, 'Currency is required'),
  bankAccounts: z.array(BankAccountSchema).default([]),
  taxId: z.string().optional(),
  socialSecurityNumber: z.string().optional(),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'check']).default('bank_transfer'),
  paymentCurrency: z.string().optional(),
  taxStatus: z.string().optional(),
  taxExempt: z.boolean().default(false),
  benefits: z.array(z.string()).default([]),
  notes: z.string().optional(),
});

export const SeafarerSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  personalInfo: PersonalInfoSchema,
  contact: ContactSchema,
  address: AddressSchema,
  documents: z.array(DocumentSchema).default([]),
  certificates: z.array(CertificateSchema).default([]),
  employment: EmploymentSchema,
  emergencyContacts: z.array(EmergencyContactSchema).default([]),
  financial: FinancialSchema,
  skills: z.array(z.string()).default([]),
  languages: z.array(
    z.object({
      language: z.string(),
      proficiency: z.enum(['basic', 'conversational', 'fluent', 'native']),
    })
  ).default([]),
  education: z.array(
    z.object({
      institution: z.string(),
      degree: z.string(),
      fieldOfStudy: z.string(),
      startDate: dateStringSchema(),
      endDate: dateStringSchema().optional(),
      isCompleted: z.boolean().default(true),
      description: z.string().optional(),
    })
  ).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const VesselSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1, 'Vessel name is required'),
  imoNumber: z.string().min(1, 'IMO number is required'),
  mmsi: z.string().optional(),
  callSign: z.string().optional(),
  flag: z.string().min(1, 'Flag is required'),
  type: z.string().min(1, 'Vessel type is required'),
  yearBuilt: z.number().min(1900).max(new Date().getFullYear() + 1),
  grossTonnage: z.number().min(0),
  netTonnage: z.number().min(0),
  deadweight: z.number().min(0).optional(),
  lengthOverall: z.number().min(0),
  beam: z.number().min(0),
  draft: z.number().min(0),
  classificationSociety: z.string().optional(),
  classNotation: z.string().optional(),
  portOfRegistry: z.string().optional(),
  registryNumber: z.string().optional(),
  owner: z.string().optional(),
  manager: z.string().optional(),
  operator: z.string().optional(),
  hullNumber: z.string().optional(),
  engineMake: z.string().optional(),
  engineModel: z.string().optional(),
  enginePower: z.number().min(0).optional(),
  propulsion: z.string().optional(),
  maxSpeed: z.number().min(0).optional(),
  cruisingSpeed: z.number().min(0).optional(),
  fuelConsumption: z.number().min(0).optional(),
  hullType: z.string().optional(),
  hullMaterial: z.string().optional(),
  deckMaterial: z.string().optional(),
  superstructureMaterial: z.string().optional(),
  lastDryDock: dateStringSchema().optional(),
  nextDryDock: dateStringSchema().optional(),
  lastInspection: dateStringSchema().optional(),
  nextInspection: dateStringSchema().optional(),
  insurance: z.object({
    provider: z.string().optional(),
    policyNumber: z.string().optional(),
    startDate: dateStringSchema().optional(),
    endDate: dateStringSchema().optional(),
    coverage: z.string().optional(),
  }).optional(),
  documents: z.array(DocumentSchema).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CrewAssignmentSchema = z.object({
  id: z.string().uuid(),
  seafarerId: z.string().uuid(),
  vesselId: z.string().uuid(),
  companyId: z.string().uuid(),
  rank: z.string().min(1, 'Rank is required'),
  department: z.string().optional(),
  startDate: dateStringSchema(),
  endDate: dateStringSchema().optional(),
  status: z.enum(['active', 'completed', 'cancelled', 'on_leave']).default('active'),
  signOnPort: z.string().optional(),
  signOffPort: z.string().optional(),
  contractType: z.string().optional(),
  contractNumber: z.string().optional(),
  contractStartDate: dateStringSchema().optional(),
  contractEndDate: dateStringSchema().optional(),
  wage: z.object({
    basic: z.number().min(0),
    currency: z.string().min(1),
    paymentFrequency: z.enum(['monthly', 'bi_weekly', 'weekly', 'daily']).default('monthly'),
    overtimeRate: z.number().min(0).optional(),
    bonus: z.number().min(0).optional(),
    allowances: z.array(
      z.object({
        type: z.string(),
        amount: z.number().min(0),
        currency: z.string().min(1),
        frequency: z.enum(['monthly', 'bi_weekly', 'weekly', 'daily', 'one_time']).default('monthly'),
      })
    ).default([]),
  }),
  workingHours: z.object({
    hoursPerDay: z.number().min(0).max(24).default(8),
    daysPerWeek: z.number().min(0).max(7).default(6),
    overtimePolicy: z.string().optional(),
  }).optional(),
  leave: z.object({
    entitlement: z.number().min(0).default(30), // days per year
    taken: z.number().min(0).default(0),
    balance: z.number().min(0).default(0),
  }).optional(),
  documents: z.array(DocumentSchema).default([]),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const PayrollRecordSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  seafarerId: z.string().uuid(),
  assignmentId: z.string().uuid().optional(),
  period: z.object({
    start: dateStringSchema(),
    end: dateStringSchema(),
  }),
  paymentDate: dateStringSchema().optional(),
  status: z.enum(['draft', 'approved', 'paid', 'cancelled']).default('draft'),
  earnings: z.object({
    basic: z.number().min(0).default(0),
    overtime: z.number().min(0).default(0),
    bonus: z.number().min(0).default(0),
    allowances: z.record(z.number().min(0)).default({}),
    other: z.number().min(0).default(0),
    total: z.number().min(0).default(0),
  }),
  deductions: z.object({
    tax: z.number().min(0).default(0),
    socialSecurity: z.number().min(0).default(0),
    insurance: z.number().min(0).default(0),
    unionDues: z.number().min(0).default(0),
    other: z.number().min(0).default(0),
    total: z.number().min(0).default(0),
  }),
  netPay: z.number().default(0),
  currency: z.string().min(1, 'Currency is required'),
  exchangeRate: z.number().min(0).default(1),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'check']).default('bank_transfer'),
  bankAccount: z.object({
    accountNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountName: z.string().optional(),
  }).optional(),
  notes: z.string().optional(),
  approvedBy: z.string().optional(),
  paidBy: z.string().optional(),
  paidAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  role: z.enum(['admin', 'manager', 'officer', 'crew', 'accounting']),
  companyId: z.string().uuid(),
  isActive: z.boolean().default(true),
  lastLogin: z.string().datetime().optional(),
  passwordResetToken: z.string().optional(),
  passwordResetExpires: z.string().datetime().optional(),
  emailVerified: z.boolean().default(false),
  emailVerificationToken: z.string().optional(),
  profileImage: z.string().optional(),
  preferences: z.object({
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
    dateFormat: z.string().default('YYYY-MM-DD'),
    timeFormat: z.string().default('HH:mm'),
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    notifications: z.object({
      email: z.boolean().default(true),
      push: z.boolean().default(true),
      sound: z.boolean().default(true),
    }),
  }).default({} as any), // Type assertion to handle default
  lastActive: z.string().datetime().optional(),
  isOnline: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string(),
  companyId: z.string().uuid(),
  userId: z.string().uuid(),
  userEmail: z.string().email(),
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),
  oldValue: z.any().optional(),
  newValue: z.any().optional(),
  metadata: z.record(z.any()).optional(),
  timestamp: z.string().datetime(),
});

// Export all schemas
export const schemas = {
  Address: AddressSchema,
  Contact: ContactSchema,
  CompanySettings: CompanySettingsSchema,
  Company: CompanySchema,
  PersonalInfo: PersonalInfoSchema,
  Document: DocumentSchema,
  Certificate: CertificateSchema,
  Employment: EmploymentSchema,
  EmergencyContact: EmergencyContactSchema,
  BankAccount: BankAccountSchema,
  Financial: FinancialSchema,
  Seafarer: SeafarerSchema,
  Vessel: VesselSchema,
  CrewAssignment: CrewAssignmentSchema,
  PayrollRecord: PayrollRecordSchema,
  User: UserSchema,
  AuditLog: AuditLogSchema,
};
