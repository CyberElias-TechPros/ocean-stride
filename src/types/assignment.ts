import { BaseEntity } from '@/lib/schemas_v2';

export type AssignmentFrequency = 'single' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type AssignmentStatus = 'scheduled' | 'active' | 'completed' | 'cancelled';

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
