
// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string;
}

// Store Names
export const STORE_NAMES = {
  COMPANIES: 'companies',
  VESSELS: 'vessels',
  SEAFARERS: 'seafarers',
  CREW_CHANGES: 'crewChanges',
  CREW_ASSIGNMENTS: 'crewAssignments',
  PAYROLLS: 'payrolls',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  APPLICANTS: 'applicants',
  // New stores
  CERTIFICATES: 'certificates',
  RANKS: 'ranks',
  PAYROLL_SETTINGS: 'payrollSettings',
  COMPANY_SETTINGS: 'companySettings',
} as const;

// Index Names
export const INDEX_NAMES = {
  // Company indexes
  COMPANY_BY_NAME: 'by_name',

  // Vessel indexes
  VESSEL_BY_NAME: 'by_name',
  VESSEL_BY_IMO: 'by_imo',
  VESSEL_BY_STATUS: 'by_status',
  VESSEL_BY_COMPANY: 'by_company',

  // Seafarer indexes
  SEAFARER_BY_NAME: 'by_name',
  SEAFARER_BY_RANK: 'by_rank',
  SEAFARER_BY_STATUS: 'by_status',
  SEAFARER_BY_VESSEL: 'by_vessel',
  SEAFARER_BY_COMPANY: 'by_company',

  // Crew Change indexes
  CREW_CHANGE_BY_VESSEL: 'by_vessel',
  CREW_CHANGE_BY_DATE: 'by_date',
  CREW_CHANGE_BY_STATUS: 'by_status',

  // Crew Assignment indexes
  CREW_ASSIGNMENT_BY_SEAFARER: 'by_seafarer',
  CREW_ASSIGNMENT_BY_VESSEL: 'by_vessel',
  CREW_ASSIGNMENT_BY_STATUS: 'by_status',
  CREW_ASSIGNMENT_BY_DATE_RANGE: 'by_date_range',

  // Payroll indexes
  PAYROLL_BY_SEAFARER: 'by_seafarer',
  PAYROLL_BY_VESSEL: 'by_vessel',
  PAYROLL_BY_PERIOD: 'by_period',
  PAYROLL_BY_STATUS: 'by_status',

  // Document indexes
  DOCUMENT_BY_TYPE: 'by_type',
  DOCUMENT_BY_ENTITY: 'by_entity',
  DOCUMENT_BY_EXPIRY: 'by_expiry',

  // Notification indexes
  NOTIFICATION_BY_READ_STATUS: 'by_read_status',
  NOTIFICATION_BY_DATE: 'by_date',
  NOTIFICATION_BY_TYPE: 'by_type',

  // Applicant indexes
  APPLICANT_BY_COMPANY: 'by_company',
  APPLICANT_BY_STATUS: 'by_status',
  APPLICANT_BY_POSITION: 'by_position',

  // Certificate indexes
  CERTIFICATE_BY_SEAFARER: 'by_seafarer',
  CERTIFICATE_BY_TYPE: 'by_type',
  CERTIFICATE_BY_STATUS: 'by_status',
  CERTIFICATE_BY_EXPIRY: 'by_expiry',

  // Rank indexes
  RANK_BY_COMPANY: 'by_company',
  RANK_BY_DEPARTMENT: 'by_department',

  // Payroll Settings indexes
  PAYROLL_SETTINGS_BY_COMPANY: 'by_company',

  // Company Settings indexes
  COMPANY_SETTINGS_BY_COMPANY: 'by_company',
} as const;

// Type exports
export * from '../schemas/crew.schemas';

// Re-export types from original schemas with any necessary extensions
export interface Company extends BaseEntity {
  name: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  logoUrl?: string;
  taxId?: string;
  settings: {
    currency: string;
    dateFormat: string;
    timezone: string;
  };
  stats?: {
    activeVessels: number;
    totalVessels: number;
    activeSeafarers: number;
    totalSeafarers: number;
    activeAssignments: number;
  };
}

export interface Vessel extends BaseEntity {
  name: string;
  imoNumber: string;
  type: string;
  flag: string;
  yearBuilt: number;
  grossTonnage: number;
  deadweight: number;
  callSign: string;
  mmsi: string;
  status: 'active' | 'inactive' | 'maintenance' | 'chartered';
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  notes?: string;
}

export interface SeafarerPersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodType?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  contact: {
    email: string;
    phone: string;
    address?: {
      street: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
      address?: string;
    };
  };
  photoUrl?: string;
}

export interface SeafarerDocument {
  type: 'passport' | 'seaman_book' | 'certificate' | 'medical' | 'visa' | 'other';
  number: string;
  issueDate: string;
  expiryDate: string;
  issuedBy: string;
  fileUrl?: string;
  notes?: string;
}

export interface SeafarerTraining {
  course: string;
  institution: string;
  completionDate: string;
  issueDate?: Date;
  expiryDate?: string;
  certificateNumber?: string;
  fileUrl?: string;
  notes?: string;
}

export interface SeafarerMedical {
  type: 'medical' | 'dental' | 'vaccination' | 'other';
  examinationDate: string;
  expiryDate: string;
  doctorName: string;
  clinicName: string;
  isFit: boolean;
  restrictions?: string;
  fileUrl?: string;
  notes?: string;
}

export interface SeafarerEmployment {
  rank: string;
  rankId: string; // Added to link to rank
  employeeId: string;
  department: 'deck' | 'engine' | 'catering' | 'other';
  status: 'onboard' | 'on_leave' | 'on_training' | 'inactive';
  currentVesselId?: string;
  currentVesselName?: string;
  currentAssignmentId?: string; // Added to track current assignment
  signOnDate?: string;
  contractStartDate?: Date;
  contractEndDate?: string;
  baseWage: number;
  wageCurrency: string;
  workHoursPerWeek: number;
  leaveDaysPerYear: number;
  bankAccount?: {
    accountNumber: string;
    bankName: string;
    branch?: string;
    swiftCode?: string;
    iban?: string;
  };
  taxInformation?: {
    taxId?: string;
    taxStatus?: string;
    socialSecurityNumber?: string;
  };
  employmentType: 'permanent' | 'contract' | 'temporary';
  employmentStatus: 'active' | 'inactive' | 'suspended' | 'retired';
  joinedDate: string;
  terminationDate?: string;
  terminationReason?: string;
  notes?: string;
}

export interface Seafarer extends BaseEntity {
  payrolls: any;
  personalInfo: SeafarerPersonalInfo;
  documents: SeafarerDocument[];
  employment: SeafarerEmployment;
  trainings: SeafarerTraining[];
  medicals: SeafarerMedical[];
  medicalInfo?: {
    bloodGroup?: string;
    allergies: string[];
    medicalConditions: string[];
    lastMedicalCheckup?: Date;
    nextMedicalCheckup?: Date;
    notes?: string;
  };
  emergencyContacts: Array<{
    id: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    address?: string;
    isPrimary: boolean;
  }>;
  skills: string[];
  languages: Array<{
    language: string;
    proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  }>;
  notes?: string;
}

// Payroll Item interface
export interface PayrollItem {
  id?: string;
  type: 'salary' | 'overtime' | 'bonus' | 'allowance' | 'deduction' | 'reimbursement' | 'other' | 'tax';
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  taxable: boolean;
  category?: string;
  notes?: string;
}

// Payroll interface
export interface Payroll extends BaseEntity {
  seafarerId: string;
  vesselId: string;
  assignmentId?: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'paid' | 'cancelled' | 'failed';
  basicSalary: number;
  items: PayrollItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'check' | 'other';
  paymentReference?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
  documents: string[];
}

// Type alias for compatibility
export type SeafarerWithDetails = Seafarer;

// Additional type definitions
export interface Certificate extends BaseEntity {
  seafarerId: string;
  name: string;
  type: string;
  number: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate: string;
  status: 'valid' | 'expired' | 'expiring_soon';
  documentUrl?: string;
  notes?: string;
}

export interface Rank extends BaseEntity {
  name: string;
  code: string;
  department: 'deck' | 'engine' | 'catering' | 'other';
  level: number;
  description?: string;
  baseSalary: number;
  currency: string;
  isOfficer: boolean;
  overtimeRates: {
    regular: number;
    weekend: number;
    holiday: number;
  };
  allowances: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  certificateRequirements: string[];
}

export interface CrewAssignment extends BaseEntity {
  seafarerId: string;
  vesselId: string;
  rankId: string;
  startDate: string;
  endDate?: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled' | 'terminated';
  salary: number;
  currency: string;
  rotationType: 'fixed_term' | 'rotation';
  frequency: 'single' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  customFrequency?: {
    daysOn: number;
    daysOff: number;
  };
  notes?: string;
  documents: string[];
  isActive: boolean;
  signOnDate?: string;
  signOffDate?: string;
  signedBySeafarer: boolean;
  signedByCompany: boolean;
  signedDocumentUrl?: string;
  createdBy: string;
  updatedBy: string;
}

export interface Document extends BaseEntity {
  name: string;
  type: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: 'valid' | 'expired' | 'expiring_soon' | 'renewal_in_progress';
  relatedTo: {
    entityType: 'seafarer' | 'vessel' | 'company' | 'assignment' | 'payroll';
    entityId: string;
    entityName?: string;
  };
  tags?: string[];
  description?: string;
}

export interface Notification extends BaseEntity {
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  read: boolean;
  priority?: 'low' | 'medium' | 'high';
  actionUrl?: string;
  metadata?: Record<string, any>;
}

export interface Applicant extends BaseEntity {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    nationality: string;
  };
  application: {
    position: string;
    status: 'pending' | 'reviewed' | 'accepted' | 'rejected';
    appliedDate: string;
    notes?: string;
  };
  qualifications: {
    experience: number; // years
    certificates: string[]; // certificate IDs
    skills: string[];
  };
  documents: string[]; // document IDs
}

export interface PayrollSettings extends BaseEntity {
  companyId: string;
  overtimeRate: number;
  overtimeThreshold: number;
  bonusRates: Record<string, number>;
  deductionRates: Record<string, number>;
  taxSettings: {
    taxRate: number;
    taxFreeAllowance: number;
    socialSecurityRate: number;
  };
  pensionSettings: {
    enabled: boolean;
    employeeContribution: number;
    employerContribution: number;
  };
  paymentSchedule: 'weekly' | 'biweekly' | 'monthly';
  currency: string;
}

export interface CompanySettings extends BaseEntity {
  companyId: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  fiscalYearStart: string;
  workingHoursPerWeek: number;
  defaultVesselRotationDays: number;
  defaultLeaveDays: number;
  documentSettings: {
    requiredCertificates: string[];
    documentExpiryWarningDays: number;
  };
  leavePolicy: {
    annualLeaveDays: number;
    sickLeaveDays: number;
    maternityLeaveWeeks: number;
    paternityLeaveDays: number;
  };
  notificationSettings: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    certificateExpiryWarnings: number; // days before expiry
    contractExpiry: number;
    sendSMS: boolean;
  };
  complianceSettings?: {
    enableExpiryAlerts: boolean;
    expiryThresholdDays: number;
    enableThresholdAlerts: boolean;
    complianceThreshold: number;
    enableWorkHourAlerts: boolean;
    maxWorkHoursPerWeek: number;
    notificationMethods: string[];
    alertRecipients: string[];
  };
}

// Type guards
export function isCompany(entity: any): entity is Company {
  return entity &&
         typeof entity.name === 'string' &&
         typeof entity.email === 'string' &&
         entity.settings &&
         typeof entity.settings.currency === 'string';
}

export function isVessel(entity: any): entity is Vessel {
  return entity &&
         typeof entity.name === 'string' &&
         typeof entity.imoNumber === 'string' &&
         typeof entity.type === 'string';
}

export function isSeafarer(entity: any): entity is Seafarer {
  return entity &&
         entity.personalInfo &&
         typeof entity.personalInfo.firstName === 'string' &&
         entity.employment &&
         typeof entity.employment.rank === 'string';
}

// Entity type mapping
export type EntityName = keyof typeof STORE_NAMES;

export const entityTypeMap: Record<EntityName, string> = {
  COMPANIES: 'Company',
  VESSELS: 'Vessel',
  SEAFARERS: 'Seafarer',
  CREW_CHANGES: 'CrewChange',
  PAYROLLS: 'Payroll',
  DOCUMENTS: 'Document',
  NOTIFICATIONS: 'Notification',
  APPLICANTS: 'Applicant',
  CERTIFICATES: 'Certificate',
  RANKS: 'Rank',
  CREW_ASSIGNMENTS: 'CrewAssignment',
  PAYROLL_SETTINGS: 'PayrollSettings',
  COMPANY_SETTINGS: 'CompanySettings',
} as const;
