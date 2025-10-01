export const STORE_NAMES = {
  COMPANIES: 'companies',
  VESSELS: 'vessels',
  SEAFARERS: 'seafarers',
  CREW_ASSIGNMENTS: 'crewAssignments',
  PAYROLLS: 'payrolls',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
  APPLICANTS: 'applicants',
  CERTIFICATES: 'certificates',
  RANKS: 'ranks',
  PAYROLL_SETTINGS: 'payrollSettings',
  COMPANY_SETTINGS: 'companySettings',
} as const;

export const INDEX_NAMES = {
  // Company indexes
  COMPANY_BY_NAME: 'by_name',
  
  // Vessel indexes
  VESSEL_BY_NAME: 'by_name',
  VESSEL_BY_IMO: 'by_imo',
  VESSEL_BY_TYPE: 'by_type',
  VESSEL_BY_COMPANY: 'by_company',
  
  // Seafarer indexes
  SEAFARER_BY_NAME: 'by_name',
  SEAFARER_BY_RANK: 'by_rank',
  SEAFARER_BY_CERTIFICATE: 'by_certificate',
  SEAFARER_BY_STATUS: 'by_status',
  SEAFARER_BY_VESSEL: 'by_vessel',
  SEAFARER_BY_COMPANY: 'by_company',
  
  // Crew Assignment indexes
  CREW_ASSIGNMENT_BY_SEAFARER: 'by_seafarer',
  CREW_ASSIGNMENT_BY_VESSEL: 'by_vessel',
  CREW_ASSIGNMENT_BY_STATUS: 'by_status',
  CREW_ASSIGNMENT_BY_DATE_RANGE: 'by_date_range',
  
  // Payroll indexes
  PAYROLL_BY_SEAFARER: 'by_seafarer',
  PAYROLL_BY_VESSEL: 'by_vessel',
  PAYROLL_BY_COMPANY: 'by_company',
  PAYROLL_BY_DATE_RANGE: 'by_date_range',
  PAYROLL_BY_STATUS: 'by_status',
  
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
