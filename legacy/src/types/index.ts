// Export all types
export * from './assignment.types';
export * from './payroll.types';
export * from '../lib/schemas_v2';

// User Types
export interface User {
  status: ReactI18NextChildren | Iterable<ReactI18NextChildren>;
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'seafarer';
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserCreateDto {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'manager' | 'seafarer';
}

export interface UserUpdateDto {
  email?: string;
  name?: string;
  avatar?: string;
}

// Vessel Types
export interface Vessel {
  id: string;
  name: string;
  imoNumber: string;
  type: string;
  flag: string;
  grossTonnage: number;
  yearBuilt: number;
  status: 'active' | 'maintenance' | 'inactive';
  lastInspectionDate?: string;
  nextInspectionDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VesselCreateDto {
  name: string;
  imoNumber: string;
  type: string;
  flag: string;
  grossTonnage: number;
  yearBuilt: number;
  status: 'active' | 'maintenance' | 'inactive';
}

export interface VesselUpdateDto {
  name?: string;
  imoNumber?: string;
  type?: string;
  flag?: string;
  grossTonnage?: number;
  yearBuilt?: number;
  status?: 'active' | 'maintenance' | 'inactive';
  lastInspectionDate?: string;
  nextInspectionDate?: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

// Crew Member Types
export type CrewStatus = 'active' | 'on_leave' | 'inactive' | 'on_vacation' | 'sick_leave';

export interface Certification {
  id: string;
  name: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  documentUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrewMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  nationality: string;
  rank: string;
  status: CrewStatus;
  certifications?: Certification[];
  vesselId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCrewMemberDto {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  dateOfBirth: string;
  nationality: string;
  rank: string;
  status?: CrewStatus;
}

export interface UpdateCrewMemberDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  nationality?: string;
  rank?: string;
  status?: CrewStatus;
  vesselId?: string | null;
}

// Vessel Status Types
export type VesselStatus = 'active' | 'maintenance' | 'inactive' | 'dry_dock' | 'chartered';

// User Role Types
export type UserRole = 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';

// Error Types
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  validationErrors?: Record<string, string[]>;
}
