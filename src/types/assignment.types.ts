import { BaseEntity } from '@/lib/schemas_v2';

export type AssignmentFrequency = 'single' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type AssignmentStatus = 'draft' | 'pending_approval' | 'approved' | 'active' | 'completed' | 'cancelled' | 'terminated';

export interface CrewAssignment extends BaseEntity {
  seafarerId: string;
  vesselId: string;
  rankId: string;
  startDate: string;
  endDate?: string;
  status: AssignmentStatus;
  salary: number;
  currency: string;
  rotationType: 'fixed_term' | 'rotation';
  frequency: AssignmentFrequency;
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

export interface AssignmentCreateDto {
  seafarerId: string;
  vesselId: string;
  rankId: string;
  startDate: string;
  endDate?: string;
  status?: AssignmentStatus;
  salary: number;
  currency: string;
  rotationType: 'fixed_term' | 'rotation';
  frequency: AssignmentFrequency;
  customFrequency?: {
    daysOn: number;
    daysOff: number;
  };
  notes?: string;
  documents?: string[];
  isActive?: boolean;
}

export interface AssignmentUpdateDto extends Partial<Omit<AssignmentCreateDto, 'seafarerId' | 'vesselId' | 'rankId'>> {
  status?: AssignmentStatus;
  signOnDate?: string;
  signOffDate?: string;
  signedBySeafarer?: boolean;
  signedByCompany?: boolean;
  signedDocumentUrl?: string;
}

// Type alias for compatibility
export type Assignment = CrewAssignment;
