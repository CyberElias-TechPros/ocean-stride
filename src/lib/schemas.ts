// Core entity interfaces
export interface User {
  id: string;
  email: string;
  name: string;
  companyId: string;
  role: 'admin' | 'manager' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
  companyId?: string; // Made optional
}

export interface Company {
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
  createdAt: string;
  updatedAt: string;
  id: string; // Explicitly added for clarity
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
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  maritalStatus: 'single' | 'married' | 'divorced' | 'widowed';
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
    emergencyContact: {
      name: string;
      relationship: string;
      phone: string;
      email?: string;
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

export interface SeafarerEmployment {
  rank: string;
  department: 'deck' | 'engine' | 'catering' | 'other';
  status: 'onboard' | 'on_leave' | 'on_training' | 'inactive';
  currentVesselId?: string;
  currentVesselName?: string;
  signOnDate?: string;
  contractEndDate?: string;
  baseWage: number;
  wageCurrency: string;
  workHoursPerWeek: number;
  leaveDaysPerYear: number;
  employmentType: 'permanent' | 'contract' | 'temporary';
  employmentStatus: 'active' | 'inactive' | 'suspended' | 'retired';
  joinedDate: string;
  terminationDate?: string;
  terminationReason?: string;
  notes?: string;
}

export interface SeafarerTraining {
  course: string;
  institution: string;
  completionDate: string;
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

export interface Seafarer extends BaseEntity {
  personalInfo: SeafarerPersonalInfo;
  documents: SeafarerDocument[];
  employment: SeafarerEmployment;
  trainings: SeafarerTraining[];
  medicals: SeafarerMedical[];
  skills: string[];
  languages: Array<{
    language: string;
    proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  }>;
  notes?: string;
}

export interface CrewChange extends BaseEntity {
  vesselId: string;
  vesselName: string;
  port: string;
  scheduledDate: string;
  actualDate?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  crewMembers: Array<{
    seafarerId: string;
    seafarerName: string;
    rank: string;
    type: 'sign_on' | 'sign_off';
    status: 'scheduled' | 'completed' | 'missed' | 'delayed';
    notes?: string;
  }>;
  notes?: string;
}

export interface Payroll extends BaseEntity {
  seafarerId: string;
  seafarerName: string;
  vesselId?: string;
  vesselName?: string;
  periodStart: string;
  periodEnd: string;
  basicSalary: number;
  overtimeHours: number;
  overtimeRate: number;
  bonuses: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  deductions: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  netSalary: number;
  currency: string;
  paymentDate: string;
  paymentMethod: 'bank_transfer' | 'cash' | 'check';
  bankDetails?: {
    accountNumber: string;
    bankName: string;
    branch?: string;
    swiftCode?: string;
    iban?: string;
  };
  status: 'draft' | 'pending' | 'paid' | 'cancelled';
  notes?: string;
}

export interface Document extends BaseEntity {
  type: 'contract' | 'certificate' | 'medical' | 'training' | 'other';
  name: string;
  description?: string;
  issueDate: string;
  expiryDate?: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  relatedTo: {
    entityType: 'seafarer' | 'vessel' | 'company' | 'crew_change' | 'payroll';
    entityId: string;
    entityName: string;
  };
  status: 'valid' | 'expired' | 'expiring_soon' | 'renewal_in_progress';
  notes?: string;
}

export interface Notification extends BaseEntity {
  type: 'info' | 'warning' | 'error' | 'success' | 'reminder';
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  scheduledAt?: string;
  expiresAt?: string;
}

// Recruitment
export interface Applicant extends BaseEntity {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality: string;
    dateOfBirth: string;
  };
  application: {
    position: string;
    experience: number;
    status: 'pending' | 'reviewing' | 'interview' | 'approved' | 'rejected';
    appliedDate: string;
    priority: 'high' | 'medium' | 'low';
  };
  qualifications: {
    rank: string;
    certificates: string[];
    lastVessel?: string;
  };
}

// Type guards
export function isCompany(entity: any): entity is Company {
  return entity && 'name' in entity && 'address' in entity;
}

export function isVessel(entity: any): entity is Vessel {
  return entity && 'name' in entity && 'imoNumber' in entity && 'type' in entity;
}

export function isSeafarer(entity: any): entity is Seafarer {
  return entity && 'personalInfo' in entity && 'employment' in entity;
}

// Utility types
export type EntityType = Company | Vessel | Seafarer | CrewChange | Payroll | Document | Notification;
export type EntityName = 'company' | 'vessel' | 'seafarer' | 'crewChange' | 'payroll' | 'document' | 'notification';

// Type mapping
export const entityTypeMap: Record<EntityName, string> = {
  company: 'Company',
  vessel: 'Vessel',
  seafarer: 'Seafarer',
  crewChange: 'Crew Change',
  payroll: 'Payroll',
  document: 'Document',
  notification: 'Notification',
};

// IndexedDB store names
export const STORE_NAMES = {
  COMPANIES: 'companies',
  VESSELS: 'vessels',
  SEAFARERS: 'seafarers',
  CREW_CHANGES: 'crew_changes',
  PAYROLLS: 'payrolls',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  APPLICANTS: 'applicants',
} as const;

// IndexedDB index names
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
  SEAFARER_BY_DOCUMENT_EXPIRY: 'by_document_expiry',
  
  // Crew change indexes
  CREW_CHANGE_BY_VESSEL: 'by_vessel',
  CREW_CHANGE_BY_DATE: 'by_date',
  CREW_CHANGE_BY_STATUS: 'by_status',
  
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
} as const;
