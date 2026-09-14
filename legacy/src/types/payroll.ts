import { BaseEntity } from '@/lib/schemas_v2';

export interface PayrollItem {
  type: 'salary' | 'overtime' | 'bonus' | 'allowance' | 'deduction' | 'reimbursement' | 'other';
  description: string;
  amount: number;
  quantity?: number;
  rate?: number;
  taxable: boolean;
  category?: string;
}

export interface Payroll extends BaseEntity {
  seafarerId: string;
  vesselId: string;
  assignmentId?: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled';
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
