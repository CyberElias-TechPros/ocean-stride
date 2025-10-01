import { z } from 'zod';
import {
  assignmentSchema,
  payrollSchema,
  rankSchema,
  Assignment,
  Payroll,
  Rank,
  AssignmentStatus,
  PayrollStatus
} from './personnel.schemas';

// Business rule validation utilities

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface DataIntegrityCheck {
  entity: string;
  field: string;
  value: any;
  relatedEntity?: string;
  relatedField?: string;
  relatedValue?: any;
  issue: string;
  severity: 'error' | 'warning';
}

// Business Rules Validation

export function validateAssignmentBusinessRules(assignment: Partial<Assignment>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: End date must be after start date
  if (assignment.startDate && assignment.endDate) {
    const start = new Date(assignment.startDate);
    const end = new Date(assignment.endDate);
    if (end <= start) {
      errors.push('End date must be after start date');
    }
  }

  // Rule 2: Salary must be reasonable (not zero for active assignments)
  if (assignment.status === 'active' && (!assignment.salary || assignment.salary <= 0)) {
    errors.push('Active assignments must have a positive salary');
  }

  // Rule 3: Signed contracts for active assignments
  if (assignment.status === 'active' && (!assignment.signedBySeafarer || !assignment.signedByCompany)) {
    errors.push('Active assignments must be signed by both seafarer and company');
  }

  // Rule 4: Custom frequency validation
  if (assignment.frequency === 'custom' && !assignment.customFrequency) {
    errors.push('Custom frequency assignments must specify days on and off');
  }

  // Warning: High salary
  if (assignment.salary && assignment.salary > 100000) {
    warnings.push('Salary is unusually high, please verify');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validatePayrollBusinessRules(payroll: Partial<Payroll>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Period end must be after period start
  if (payroll.periodStart && payroll.periodEnd) {
    const start = new Date(payroll.periodStart);
    const end = new Date(payroll.periodEnd);
    if (end <= start) {
      errors.push('Payroll period end must be after period start');
    }
  }

  // Rule 2: Payment date should be after period end
  if (payroll.periodEnd && payroll.paymentDate) {
    const periodEnd = new Date(payroll.periodEnd);
    const paymentDate = new Date(payroll.paymentDate);
    if (paymentDate < periodEnd) {
      warnings.push('Payment date is before period end');
    }
  }

  // Rule 3: Net pay calculation validation
  if (payroll.totalEarnings !== undefined && payroll.totalDeductions !== undefined && payroll.netPay !== undefined) {
    const calculatedNetPay = payroll.totalEarnings - payroll.totalDeductions;
    if (Math.abs(calculatedNetPay - payroll.netPay) > 0.01) {
      errors.push('Net pay calculation does not match earnings minus deductions');
    }
  }

  // Rule 4: Items total validation
  if (payroll.items && payroll.totalEarnings !== undefined) {
    const calculatedEarnings = payroll.items
      .filter(item => item.type !== 'deduction' && item.type !== 'tax')
      .reduce((sum, item) => sum + item.total, 0);
    const calculatedDeductions = payroll.items
      .filter(item => item.type === 'deduction' || item.type === 'tax')
      .reduce((sum, item) => sum + item.total, 0);

    if (Math.abs(calculatedEarnings - payroll.totalEarnings) > 0.01) {
      errors.push('Total earnings does not match sum of earning items');
    }
    if (payroll.totalDeductions !== undefined && Math.abs(calculatedDeductions - payroll.totalDeductions) > 0.01) {
      errors.push('Total deductions does not match sum of deduction items');
    }
  }

  // Rule 5: Negative net pay warning
  if (payroll.netPay !== undefined && payroll.netPay < 0) {
    warnings.push('Net pay is negative, please review deductions');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

export function validateRankBusinessRules(rank: Partial<Rank>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Rule 1: Officer ranks should have higher base salary
  if (rank.isOfficer && rank.baseSalary && rank.baseSalary < 50000) {
    warnings.push('Officer ranks typically have higher base salaries');
  }

  // Rule 2: Department-specific level validation
  if (rank.department === 'deck' && rank.level && rank.level > 10) {
    warnings.push('Deck department levels are typically below 10');
  }

  // Rule 3: Required certificates for senior ranks
  if (rank.level && rank.level >= 8 && (!rank.requiredCertificates || rank.requiredCertificates.length === 0)) {
    warnings.push('Senior ranks typically require specific certificates');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

// Data Integrity Checks

export function checkReferentialIntegrity(
  entityType: string,
  entityData: any,
  relatedData: Record<string, any[]>
): DataIntegrityCheck[] {
  const issues: DataIntegrityCheck[] = [];

  switch (entityType) {
    case 'assignment':
      // Check if seafarer exists
      if (entityData.seafarerId && !relatedData.seafarers?.find(s => s.id === entityData.seafarerId)) {
        issues.push({
          entity: 'assignment',
          field: 'seafarerId',
          value: entityData.seafarerId,
          relatedEntity: 'seafarer',
          issue: 'Referenced seafarer does not exist',
          severity: 'error'
        });
      }

      // Check if vessel exists
      if (entityData.vesselId && !relatedData.vessels?.find(v => v.id === entityData.vesselId)) {
        issues.push({
          entity: 'assignment',
          field: 'vesselId',
          value: entityData.vesselId,
          relatedEntity: 'vessel',
          issue: 'Referenced vessel does not exist',
          severity: 'error'
        });
      }

      // Check if rank exists
      if (entityData.rankId && !relatedData.ranks?.find(r => r.id === entityData.rankId)) {
        issues.push({
          entity: 'assignment',
          field: 'rankId',
          value: entityData.rankId,
          relatedEntity: 'rank',
          issue: 'Referenced rank does not exist',
          severity: 'error'
        });
      }
      break;

    case 'payroll':
      // Check if seafarer exists
      if (entityData.seafarerId && !relatedData.seafarers?.find(s => s.id === entityData.seafarerId)) {
        issues.push({
          entity: 'payroll',
          field: 'seafarerId',
          value: entityData.seafarerId,
          relatedEntity: 'seafarer',
          issue: 'Referenced seafarer does not exist',
          severity: 'error'
        });
      }

      // Check if assignment exists
      if (entityData.assignmentId && !relatedData.assignments?.find(a => a.id === entityData.assignmentId)) {
        issues.push({
          entity: 'payroll',
          field: 'assignmentId',
          value: entityData.assignmentId,
          relatedEntity: 'assignment',
          issue: 'Referenced assignment does not exist',
          severity: 'error'
        });
      }
      break;
  }

  return issues;
}

// Data Sanitization Middleware

export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

export function sanitizeNumericInput(input: any): number | null {
  if (typeof input === 'number' && !isNaN(input)) {
    return input;
  }

  if (typeof input === 'string') {
    const parsed = parseFloat(input.replace(/[^\d.-]/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateCurrency(currency: string): boolean {
  // ISO 4217 currency codes are 3 letters
  return /^[A-Z]{3}$/.test(currency);
}

export function validateDateRange(startDate: string, endDate: string): boolean {
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return start < end;
  } catch {
    return false;
  }
}

// Migration and Backup Validation

export interface MigrationValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export function validateMigrationData(
  sourceData: any[],
  targetSchema: z.ZodSchema,
  entityType: string
): MigrationValidationResult {
  const issues: string[] = [];
  const recommendations: string[] = [];

  let validCount = 0;
  let invalidCount = 0;

  for (const item of sourceData) {
    const result = targetSchema.safeParse(item);
    if (result.success) {
      validCount++;
    } else {
      invalidCount++;
      issues.push(`Invalid ${entityType} data: ${result.error.errors.map(e => e.message).join(', ')}`);
    }
  }

  if (invalidCount > 0) {
    recommendations.push(`Found ${invalidCount} invalid ${entityType} records out of ${sourceData.length}`);
    recommendations.push('Consider data cleansing before migration');
  }

  return {
    isValid: invalidCount === 0,
    issues,
    recommendations
  };
}

export function validateBackupIntegrity(
  backupData: Record<string, any[]>,
  expectedCounts?: Record<string, number>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for required entities
  const requiredEntities = ['assignments', 'payrolls', 'ranks'];
  for (const entity of requiredEntities) {
    if (!backupData[entity]) {
      errors.push(`Missing ${entity} data in backup`);
    }
  }

  // Check data counts if expected counts provided
  if (expectedCounts) {
    for (const [entity, expectedCount] of Object.entries(expectedCounts)) {
      const actualCount = backupData[entity]?.length || 0;
      if (actualCount !== expectedCount) {
        warnings.push(`${entity}: expected ${expectedCount}, found ${actualCount}`);
      }
    }
  }

  // Check referential integrity within backup
  for (const assignment of backupData.assignments || []) {
    if (assignment.seafarerId && !backupData.seafarers?.find(s => s.id === assignment.seafarerId)) {
      errors.push(`Assignment ${assignment.id} references non-existent seafarer ${assignment.seafarerId}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}