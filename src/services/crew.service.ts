import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import { 
  CrewAssignment, 
  crewAssignmentSchema,
  Certificate,
  certificateSchema,
  Rank,
  rankSchema,
  PayrollSettings,
  payrollSettingsSchema,
  Payroll,
  payrollSchema
} from '@/schemas/crew.schemas';
import { v4 as uuidv4 } from 'uuid';

// Crew Assignment Service
export const crewService = {
  // Assign crew to vessel
  async assignCrew(assignment: Omit<CrewAssignment, 'id' | 'status'>): Promise<CrewAssignment> {
    await db.init();
    
    const newAssignment: CrewAssignment = {
      ...assignment,
      id: uuidv4(),
      status: 'scheduled'
    };
    
    // Validate the assignment
    const validated = crewAssignmentSchema.parse(newAssignment);
    
    // Save to database
    await db.add(STORE_NAMES.CREW_ASSIGNMENTS, validated);
    
    return validated;
  },
  
  // Update crew assignment
  async updateCrewAssignment(id: string, updates: Partial<CrewAssignment>): Promise<CrewAssignment> {
    await db.init();
    
    // Get existing assignment
    const existing = await db.get<CrewAssignment>(STORE_NAMES.CREW_ASSIGNMENTS, id);
    if (!existing) {
      throw new Error('Crew assignment not found');
    }
    
    // Merge updates
    const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    
    // Validate the update
    const validated = crewAssignmentSchema.parse(updated);
    
    // Save to database
    await db.update(STORE_NAMES.CREW_ASSIGNMENTS, id, validated);
    
    return validated;
  },
  
  // Get crew assignments by seafarer
  async getSeafarerAssignments(seafarerId: string): Promise<CrewAssignment[]> {
    await db.init();
    return db.getByIndex(
      STORE_NAMES.CREW_ASSIGNMENTS, 
      'seafarerId', 
      seafarerId
    ) as Promise<CrewAssignment[]>;
  },
  
  // Get vessel crew
  async getVesselCrew(vesselId: string): Promise<CrewAssignment[]> {
    await db.init();
    return db.getByIndex(
      STORE_NAMES.CREW_ASSIGNMENTS, 
      'vesselId', 
      vesselId
    ) as Promise<CrewAssignment[]>;
  },
  
  // Get active assignments for a seafarer
  async getActiveSeafarerAssignment(seafarerId: string): Promise<CrewAssignment | null> {
    const assignments = await this.getSeafarerAssignments(seafarerId);
    const now = new Date().toISOString();
    
    return assignments.find(a => 
      a.status === 'active' && 
      (!a.startDate || a.startDate <= now) &&
      (!a.endDate || a.endDate >= now)
    ) || null;
  },
  
  // Certificate Management
  async addCertificate(cert: Omit<Certificate, 'id'>): Promise<Certificate> {
    await db.init();
    
    const newCert: Certificate = {
      ...cert,
      id: uuidv4(),
      status: this.calculateCertificateStatus(cert.issueDate, cert.expiryDate)
    };
    
    const validated = certificateSchema.parse(newCert);
    await db.add(STORE_NAMES.CERTIFICATES, validated);
    
    return validated;
  },
  
  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<Certificate> {
    await db.init();
    
    const existing = await db.get<Certificate>(STORE_NAMES.CERTIFICATES, id);
    if (!existing) {
      throw new Error('Certificate not found');
    }
    
    const updated = { 
      ...existing, 
      ...updates,
      status: updates.expiryDate || updates.issueDate
        ? this.calculateCertificateStatus(
            updates.issueDate || existing.issueDate,
            updates.expiryDate || existing.expiryDate
          )
        : existing.status
    };
    
    const validated = certificateSchema.parse(updated);
    await db.update(STORE_NAMES.CERTIFICATES, id, validated);
    
    return validated;
  },
  
  async getSeafarerCertificates(seafarerId: string): Promise<Certificate[]> {
    await db.init();
    return db.getByIndex(
      STORE_NAMES.CERTIFICATES, 
      'seafarerId', 
      seafarerId
    ) as Promise<Certificate[]>;
  },
  
  async getExpiringCertificates(days: number = 30): Promise<Certificate[]> {
    await db.init();
    const allCerts = await db.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
    const now = new Date();
    const expiryDate = new Date();
    expiryDate.setDate(now.getDate() + days);
    
    return allCerts.filter(cert => {
      const expDate = new Date(cert.expiryDate);
      return expDate > now && expDate <= expiryDate;
    });
  },
  
  // Helper to calculate certificate status
  calculateCertificateStatus(issueDate: string, expiryDate: string): 'valid' | 'expired' | 'expiring_soon' {
    const now = new Date();
    const expDate = new Date(expiryDate);
    
    if (expDate < now) return 'expired';
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);
    
    return expDate <= thirtyDaysFromNow ? 'expiring_soon' : 'valid';
  },
  
  // Rank Management
  async createRank(rank: Omit<Rank, 'id'>): Promise<Rank> {
    await db.init();
    
    const newRank: Rank = {
      ...rank,
      id: uuidv4()
    };
    
    const validated = rankSchema.parse(newRank);
    await db.add(STORE_NAMES.RANKS, validated);
    
    return validated;
  },
  
  async updateRank(id: string, updates: Partial<Rank>): Promise<Rank> {
    await db.init();
    
    const existing = await db.get<Rank>(STORE_NAMES.RANKS, id);
    if (!existing) {
      throw new Error('Rank not found');
    }
    
    const updated = { ...existing, ...updates };
    const validated = rankSchema.parse(updated);
    
    await db.update(STORE_NAMES.RANKS, id, validated);
    
    return validated;
  },
  
  async getCompanyRanks(companyId: string): Promise<Rank[]> {
    await db.init();
    return db.getByIndex(
      STORE_NAMES.RANKS, 
      'companyId', 
      companyId
    ) as Promise<Rank[]>;
  },
  
  // Payroll Settings
  async getPayrollSettings(companyId: string): Promise<PayrollSettings> {
    await db.init();
    
    const settings = await db.getByIndex<PayrollSettings>(
      STORE_NAMES.PAYROLL_SETTINGS,
      'companyId',
      companyId
    );
    
    if (settings.length > 0) {
      return settings[0];
    }
    
    // Return default settings if none exist
    const defaultSettings: PayrollSettings = {
      id: uuidv4(),
      companyId,
      overtimeRate: 1.5,
      overtimeThreshold: 40,
      bonusRates: {},
      deductionRates: {},
      taxSettings: {
        taxRate: 20,
        taxFreeAllowance: 0,
        socialSecurityRate: 5
      },
      pensionSettings: {
        enabled: true,
        employeeContribution: 5,
        employerContribution: 10
      },
      paymentSchedule: 'monthly'
    };
    
    await db.add(STORE_NAMES.PAYROLL_SETTINGS, defaultSettings);
    return defaultSettings;
  },
  
  async updatePayrollSettings(companyId: string, updates: Partial<PayrollSettings>): Promise<PayrollSettings> {
    await db.init();
    
    const existing = await this.getPayrollSettings(companyId);
    const updated = { ...existing, ...updates };
    const validated = payrollSettingsSchema.parse(updated);
    
    await db.update(STORE_NAMES.PAYROLL_SETTINGS, validated.id!, validated);
    
    return validated;
  },
  
  // Payroll Processing
  async generatePayroll(seafarerId: string, periodStart: string, periodEnd: string): Promise<Payroll> {
    await db.init();
    
    // Get seafarer and their active assignment
    const seafarer = await db.get(STORE_NAMES.SEAFARERS, seafarerId);
    if (!seafarer) {
      throw new Error('Seafarer not found');
    }
    
    const assignment = await this.getActiveSeafarerAssignment(seafarerId);
    if (!assignment) {
      throw new Error('No active assignment found for seafarer');
    }
    
    // Get payroll settings
    const settings = await this.getPayrollSettings(assignment.companyId);
    
    // Calculate payroll items
    const items = await this.calculatePayrollItems(seafarer, assignment, settings, periodStart, periodEnd);
    
    // Calculate totals
    const basicSalary = items.find(i => i.type === 'regular')?.amount || 0;
    const overtime = items.find(i => i.type === 'overtime')?.amount || 0;
    const bonuses = items.filter(i => i.type === 'bonus').reduce((sum, i) => sum + i.amount, 0);
    const allowances = items.filter(i => i.type === 'allowance').reduce((sum, i) => sum + i.amount, 0);
    const deductions = items.filter(i => i.type === 'deduction').reduce((sum, i) => sum + i.amount, 0);
    const taxes = items.filter(i => i.type === 'tax').reduce((sum, i) => sum + i.amount, 0);
    const pension = items.filter(i => i.type === 'pension').reduce((sum, i) => sum + i.amount, 0);
    
    const grossPay = basicSalary + overtime + bonuses + allowances;
    const totalDeductions = deductions + taxes + pension;
    const netPay = grossPay - totalDeductions;
    
    const payroll: Payroll = {
      id: uuidv4(),
      seafarerId,
      companyId: assignment.companyId,
      vesselId: assignment.vesselId,
      periodStart,
      periodEnd,
      items,
      status: 'draft',
      paymentMethod: 'bank_transfer',
      metadata: {
        basicSalary,
        overtime,
        bonuses,
        allowances,
        deductions,
        taxes,
        pension,
        grossPay,
        totalDeductions,
        netPay
      }
    };
    
    const validated = payrollSchema.parse(payroll);
    await db.add(STORE_NAMES.PAYROLLS, validated);
    
    return validated;
  },
  
  private async calculatePayrollItems(
    seafarer: any,
    assignment: CrewAssignment,
    settings: PayrollSettings,
    periodStart: string,
    periodEnd: string
  ) {
    const items: any[] = [];
    
    // Add basic salary (prorated if needed)
    items.push({
      type: 'regular',
      description: 'Basic Salary',
      amount: assignment.salary,
      taxable: true
    });
    
    // Add overtime if any
    // This is a simplified example - in a real app, you'd track actual hours worked
    const overtimeHours = 0; // Get from timesheet data
    if (overtimeHours > 0) {
      items.push({
        type: 'overtime',
        description: 'Overtime Pay',
        amount: overtimeHours * (assignment.salary / 160) * settings.overtimeRate,
        rate: (assignment.salary / 160) * settings.overtimeRate,
        quantity: overtimeHours,
        taxable: true
      });
    }
    
    // Add pension contributions
    if (settings.pensionSettings.enabled) {
      const grossPay = items.reduce((sum, i) => sum + i.amount, 0);
      
      // Employee contribution
      items.push({
        type: 'pension',
        description: 'Pension Contribution (Employee)',
        amount: grossPay * (settings.pensionSettings.employeeContribution / 100),
        rate: settings.pensionSettings.employeeContribution,
        taxable: false
      });
      
      // Employer contribution (not deducted from pay, but tracked)
      items.push({
        type: 'pension',
        description: 'Pension Contribution (Employer)',
        amount: grossPay * (settings.pensionSettings.employerContribution / 100),
        rate: settings.pensionSettings.employerContribution,
        taxable: false
      });
    }
    
    // Add taxes
    const grossPay = items.reduce((sum, i) => i.taxable ? sum + i.amount : sum, 0);
    const taxableIncome = Math.max(0, grossPay - (settings.taxSettings.taxFreeAllowance || 0));
    
    if (taxableIncome > 0) {
      // Income tax
      items.push({
        type: 'tax',
        description: 'Income Tax',
        amount: taxableIncome * (settings.taxSettings.taxRate / 100),
        rate: settings.taxSettings.taxRate,
        taxable: false
      });
      
      // Social security
      items.push({
        type: 'tax',
        description: 'Social Security',
        amount: taxableIncome * (settings.taxSettings.socialSecurityRate / 100),
        rate: settings.taxSettings.socialSecurityRate,
        taxable: false
      });
    }
    
    return items;
  },
  
  // Other payroll operations...
  async getSeafarerPayrollHistory(seafarerId: string): Promise<Payroll[]> {
    await db.init();
    return db.getByIndex(
      STORE_NAMES.PAYROLLS,
      'seafarerId',
      seafarerId
    ) as Promise<Payroll[]>;
  },
  
  async getCompanyPayrolls(companyId: string, status?: string): Promise<Payroll[]> {
    await db.init();
    let payrolls = await db.getByIndex<Payroll>(
      STORE_NAMES.PAYROLLS,
      'companyId',
      companyId
    );
    
    if (status) {
      payrolls = payrolls.filter(p => p.status === status);
    }
    
    return payrolls;
  },
  
  async approvePayroll(payrollId: string): Promise<Payroll> {
    await db.init();
    
    const payroll = await db.get<Payroll>(STORE_NAMES.PAYROLLS, payrollId);
    if (!payroll) {
      throw new Error('Payroll not found');
    }
    
    const updated = { ...payroll, status: 'approved' };
    await db.update(STORE_NAMES.PAYROLLS, payrollId, updated);
    
    return updated;
  },
  
  async processPayroll(payrollId: string, paymentDate: string): Promise<Payroll> {
    await db.init();
    
    const payroll = await db.get<Payroll>(STORE_NAMES.PAYROLLS, payrollId);
    if (!payroll) {
      throw new Error('Payroll not found');
    }
    
    const updated = { 
      ...payroll, 
      status: 'paid',
      paymentDate
    };
    
    await db.update(STORE_NAMES.PAYROLLS, payrollId, updated);
    
    // In a real app, you might want to trigger bank transfer here
    
    return updated;
  }
};
