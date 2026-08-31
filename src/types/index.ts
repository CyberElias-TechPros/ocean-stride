// Core domain types come from the canonical schema module.
export * from '../lib/schemas_v2';

// Assignment / payroll aliases (kept outside the star-export to avoid name
// clashes with the canonical schemas_v2 exports).
export type { CrewAssignment as Assignment } from './assignment.types';
export type { AssignmentStatus, AssignmentFrequency, AssignmentCreateDto, AssignmentUpdateDto } from './assignment.types';
export type { PayrollStatus, PaymentMethod } from './payroll.types';

// User / auth types
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';
  avatar?: string;
  status?: string;
  companyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface UserCreateDto {
  email: string;
  name: string;
  password: string;
  role?: 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';
}

export interface UserUpdateDto {
  email?: string;
  name?: string;
  avatar?: string;
  role?: 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';
}

// Legacy aliases used by the user service layer.
export type CreateUserDto = UserCreateDto;
export type UpdateUserDto = UserUpdateDto;

// Vessel types
export type VesselStatus = 'active' | 'maintenance' | 'inactive' | 'dry_dock' | 'chartered';
export interface VesselCreateDto {
  name: string;
  imoNumber: string;
  type: string;
  flag: string;
  grossTonnage: number;
  yearBuilt: number;
  status: VesselStatus;
}
export interface VesselUpdateDto {
  name?: string;
  imoNumber?: string;
  type?: string;
  flag?: string;
  grossTonnage?: number;
  yearBuilt?: number;
  status?: VesselStatus;
  lastInspectionDate?: string;
  nextInspectionDate?: string;
}

// API response types
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

// Auth types
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

// Crew member API types
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

// Role / error types
export type UserRole = 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
  validationErrors?: Record<string, string[]>;
}
