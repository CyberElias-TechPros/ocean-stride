import { BaseEntity } from '@/lib/schemas_v2';

export type PayrollStatus = 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled';
export type PaymentMethod = 'bank_transfer' | 'cash' | 'check' | 'other';

export interface PayrollItem {
  id?: string;
  type: 'salary' | 'overtime' | 'bonus' | 'allowance' | 'deduction' | 'reimbursement' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  taxable: boolean;
  category?: string;
  notes?: string;
}

export interface Payroll extends BaseEntity {
  seafarerId: string;
  vesselId: string;
  assignmentId?: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: PayrollStatus;
  basicSalary: number;
  items: PayrollItem[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
  documents: string[];
}

export interface PayrollCreateDto {
  seafarerId: string;
  vesselId: string;
  assignmentId?: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status?: PayrollStatus;
  basicSalary: number;
  items: Omit<PayrollItem, 'id'>[];
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  notes?: string;
  documents?: string[];
}

export interface PayrollUpdateDto extends Partial<Omit<PayrollCreateDto, 'seafarerId' | 'vesselId' | 'periodStart' | 'periodEnd'>> {
  status?: PayrollStatus;
  approvedBy?: string;
  approvedAt?: string;
  paidBy?: string;
  paidAt?: string;
}
