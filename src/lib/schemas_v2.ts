import { z } from 'zod';

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
  PAYROLLS: 'payrolls',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  APPLICANTS: 'applicants',
  // New stores
  CERTIFICATES: 'certificates',
  RANKS: 'ranks',
  CREW_ASSIGNMENTS: 'crewAssignments',
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
  
  // New indexes
  CERTIFICATE_BY_SEAFARER: 'by_seafarer',
  CERTIFICATE_BY_TYPE: 'by_type',
  CERTIFICATE_BY_STATUS: 'by_status',
  CERTIFICATE_BY_EXPIRY: 'by_expiry',
  
  RANK_BY_COMPANY: 'by_company',
  RANK_BY_DEPARTMENT: 'by_department',
  
  CREW_ASSIGNMENT_BY_SEAFARER: 'by_seafarer',
  CREW_ASSIGNMENT_BY_VESSEL: 'by_vessel',
  CREW_ASSIGNMENT_BY_STATUS: 'by_status',
  CREW_ASSIGNMENT_BY_DATE_RANGE: 'by_date_range',
  
  PAYROLL_SETTINGS_BY_COMPANY: 'by_company',
  
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

export interface SeafarerEmployment {
  rank: string;
  rankId: string; // Added to link to rank
  department: 'deck' | 'engine' | 'catering' | 'other';
  status: 'onboard' | 'on_leave' | 'on_training' | 'inactive';
  currentVesselId?: string;
  currentVesselName?: string;
  currentAssignmentId?: string; // Added to track current assignment
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

export interface Seafarer extends BaseEntity {
  personalInfo: SeafarerPersonalInfo;
  documents: string[]; // Array of document IDs
  employment: SeafarerEmployment;
  trainings: string[]; // Array of training IDs
  medicals: string[]; // Array of medical record IDs
  skills: string[];
  languages: Array<{
    language: string;
    proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
  }>;
  notes?: string;
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
