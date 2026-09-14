import { useCallback, useState } from 'react';
import {
  validateAssignmentBusinessRules,
  validatePayrollBusinessRules,
  validateRankBusinessRules,
  checkReferentialIntegrity,
  sanitizeInput,
  sanitizeNumericInput,
  validateEmail,
  validateCurrency,
  validateDateRange,
  ValidationResult,
  DataIntegrityCheck
} from '../lib/validation/dataValidation';

export interface ValidationHookResult {
  validate: (data: any, type: 'assignment' | 'payroll' | 'rank') => ValidationResult;
  checkIntegrity: (entityType: string, entityData: any, relatedData: Record<string, any[]>) => DataIntegrityCheck[];
  sanitize: (input: string) => string;
  sanitizeNumeric: (input: any) => number | null;
  validateEmail: (email: string) => boolean;
  validateCurrency: (currency: string) => boolean;
  validateDateRange: (startDate: string, endDate: string) => boolean;
  isValidating: boolean;
  lastResult: ValidationResult | null;
}

export function useDataValidation(): ValidationHookResult {
  const [isValidating, setIsValidating] = useState(false);
  const [lastResult, setLastResult] = useState<ValidationResult | null>(null);

  const validate = useCallback((data: any, type: 'assignment' | 'payroll' | 'rank'): ValidationResult => {
    setIsValidating(true);

    try {
      let result: ValidationResult;

      switch (type) {
        case 'assignment':
          result = validateAssignmentBusinessRules(data);
          break;
        case 'payroll':
          result = validatePayrollBusinessRules(data);
          break;
        case 'rank':
          result = validateRankBusinessRules(data);
          break;
        default:
          result = { isValid: false, errors: ['Unknown validation type'], warnings: [] };
      }

      setLastResult(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const checkIntegrity = useCallback((
    entityType: string,
    entityData: any,
    relatedData: Record<string, any[]>
  ): DataIntegrityCheck[] => {
    return checkReferentialIntegrity(entityType, entityData, relatedData);
  }, []);

  const sanitize = useCallback((input: string): string => {
    return sanitizeInput(input);
  }, []);

  const sanitizeNumeric = useCallback((input: any): number | null => {
    return sanitizeNumericInput(input);
  }, []);

  const validateEmailAddress = useCallback((email: string): boolean => {
    return validateEmail(email);
  }, []);

  const validateCurrencyCode = useCallback((currency: string): boolean => {
    return validateCurrency(currency);
  }, []);

  const validateDateRangeCheck = useCallback((startDate: string, endDate: string): boolean => {
    return validateDateRange(startDate, endDate);
  }, []);

  return {
    validate,
    checkIntegrity,
    sanitize,
    sanitizeNumeric,
    validateEmail: validateEmailAddress,
    validateCurrency: validateCurrencyCode,
    validateDateRange: validateDateRangeCheck,
    isValidating,
    lastResult
  };
}

// Hook for form validation with real-time feedback
export function useFormValidation() {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [fieldWarnings, setFieldWarnings] = useState<Record<string, string>>({});

  const validateField = useCallback((fieldName: string, value: any, rules: ValidationRule[]) => {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      const result = rule.validate(value);
      if (result.error) errors.push(result.error);
      if (result.warning) warnings.push(result.warning);
    }

    setFieldErrors(prev => ({
      ...prev,
      [fieldName]: errors.length > 0 ? errors[0] : ''
    }));

    setFieldWarnings(prev => ({
      ...prev,
      [fieldName]: warnings.length > 0 ? warnings[0] : ''
    }));

    return { hasError: errors.length > 0, hasWarning: warnings.length > 0 };
  }, []);

  const clearFieldValidation = useCallback((fieldName: string) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });

    setFieldWarnings(prev => {
      const newWarnings = { ...prev };
      delete newWarnings[fieldName];
      return newWarnings;
    });
  }, []);

  const hasErrors = Object.values(fieldErrors).some(error => error !== '');
  const hasWarnings = Object.values(fieldWarnings).some(warning => warning !== '');

  return {
    fieldErrors,
    fieldWarnings,
    validateField,
    clearFieldValidation,
    hasErrors,
    hasWarnings
  };
}

export interface ValidationRule {
  validate: (value: any) => { error?: string; warning?: string };
}

// Common validation rules
export const validationRules = {
  required: (message = 'This field is required'): ValidationRule => ({
    validate: (value) => ({
      error: !value || (typeof value === 'string' && value.trim() === '') ? message : undefined
    })
  }),

  email: (message = 'Invalid email format'): ValidationRule => ({
    validate: (value) => ({
      error: value && !validateEmail(value) ? message : undefined
    })
  }),

  numeric: (message = 'Must be a valid number'): ValidationRule => ({
    validate: (value) => ({
      error: value && sanitizeNumericInput(value) === null ? message : undefined
    })
  }),

  positive: (message = 'Must be a positive number'): ValidationRule => ({
    validate: (value) => {
      const num = sanitizeNumericInput(value);
      return {
        error: num !== null && num <= 0 ? message : undefined
      };
    }
  }),

  currency: (message = 'Invalid currency code'): ValidationRule => ({
    validate: (value) => ({
      error: value && !validateCurrency(value) ? message : undefined
    })
  }),

  maxLength: (maxLength: number, message?: string): ValidationRule => ({
    validate: (value) => ({
      error: value && typeof value === 'string' && value.length > maxLength
        ? (message || `Maximum length is ${maxLength} characters`)
        : undefined
    })
  }),

  minLength: (minLength: number, message?: string): ValidationRule => ({
    validate: (value) => ({
      error: value && typeof value === 'string' && value.length < minLength
        ? (message || `Minimum length is ${minLength} characters`)
        : undefined
    })
  }),

  dateRange: (startDate: string, message = 'Invalid date range'): ValidationRule => ({
    validate: (value) => ({
      error: value && !validateDateRange(startDate, value) ? message : undefined
    })
  })
};