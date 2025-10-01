import { Request, Response, NextFunction } from 'express';
import {
  sanitizeInput,
  sanitizeNumericInput,
  validateEmail,
  validateCurrency
} from '../validation/dataValidation';

// Type definitions for sanitized request body
export interface SanitizedRequest extends Request {
  sanitizedBody: Record<string, any>;
}

// Data sanitization middleware
export function dataSanitizationMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const sanitizedBody: Record<string, any> = {};

    // Sanitize each field in the request body
    for (const [key, value] of Object.entries(req.body)) {
      sanitizedBody[key] = sanitizeField(key, value);
    }

    // Attach sanitized body to request
    (req as SanitizedRequest).sanitizedBody = sanitizedBody;

    next();
  } catch (error) {
    res.status(400).json({
      error: 'Data sanitization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Field-specific sanitization
function sanitizeField(key: string, value: any): any {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return value;
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map(item => sanitizeField(key, item));
  }

  // Handle objects (but not Dates)
  if (typeof value === 'object' && value.constructor === Object) {
    const sanitizedObj: Record<string, any> = {};
    for (const [objKey, objValue] of Object.entries(value)) {
      sanitizedObj[objKey] = sanitizeField(objKey, objValue);
    }
    return sanitizedObj;
  }

  // Field-specific sanitization based on key patterns
  if (key.toLowerCase().includes('email')) {
    return sanitizeEmailField(value);
  }

  if (key.toLowerCase().includes('salary') || key.toLowerCase().includes('amount') || key.toLowerCase().includes('price')) {
    return sanitizeNumericField(value);
  }

  if (key.toLowerCase().includes('currency')) {
    return sanitizeCurrencyField(value);
  }

  if (key.toLowerCase().includes('name') || key.toLowerCase().includes('description') || key.toLowerCase().includes('notes')) {
    return sanitizeTextField(value);
  }

  if (key.toLowerCase().includes('date')) {
    return sanitizeDateField(value);
  }

  if (key.toLowerCase().includes('url') || key.toLowerCase().includes('document')) {
    return sanitizeUrlField(value);
  }

  // Default sanitization for strings
  if (typeof value === 'string') {
    return sanitizeInput(value);
  }

  // Return other types as-is
  return value;
}

function sanitizeEmailField(value: any): string | null {
  if (typeof value !== 'string') return null;

  const sanitized = sanitizeInput(value).toLowerCase().trim();

  if (!validateEmail(sanitized)) {
    throw new Error(`Invalid email format: ${value}`);
  }

  return sanitized;
}

function sanitizeNumericField(value: any): number | null {
  const sanitized = sanitizeNumericInput(value);

  if (sanitized === null) {
    throw new Error(`Invalid numeric value: ${value}`);
  }

  // Check for reasonable bounds (adjust as needed)
  if (sanitized < -1000000 || sanitized > 10000000) {
    throw new Error(`Numeric value out of reasonable bounds: ${sanitized}`);
  }

  return sanitized;
}

function sanitizeCurrencyField(value: any): string | null {
  if (typeof value !== 'string') return null;

  const sanitized = sanitizeInput(value).toUpperCase().trim();

  if (!validateCurrency(sanitized)) {
    throw new Error(`Invalid currency code: ${value}`);
  }

  return sanitized;
}

function sanitizeTextField(value: any): string {
  if (typeof value !== 'string') return '';

  const sanitized = sanitizeInput(value);

  // Check length limits
  if (sanitized.length > 10000) {
    throw new Error(`Text field too long: ${sanitized.length} characters`);
  }

  return sanitized;
}

function sanitizeDateField(value: any): string | null {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${value}`);
    }
    return date.toISOString();
  }

  if (typeof value === 'number') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid timestamp: ${value}`);
    }
    return date.toISOString();
  }

  throw new Error(`Unsupported date type: ${typeof value}`);
}

function sanitizeUrlField(value: any): string | null {
  if (typeof value !== 'string') return null;

  const sanitized = sanitizeInput(value).trim();

  try {
    new URL(sanitized);
    return sanitized;
  } catch {
    throw new Error(`Invalid URL format: ${value}`);
  }
}

// Validation middleware for business rules
export function businessRulesValidationMiddleware(
  validationFn: (data: any) => { isValid: boolean; errors: string[]; warnings: string[] }
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = (req as SanitizedRequest).sanitizedBody || req.body;

    const result = validationFn(data);

    if (!result.isValid) {
      return res.status(400).json({
        error: 'Business rule validation failed',
        errors: result.errors,
        warnings: result.warnings
      });
    }

    // Attach warnings to request for logging/handling
    (req as any).validationWarnings = result.warnings;

    next();
  };
}

// Rate limiting for data operations
const operationCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimitMiddleware(maxOperations: number = 100, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'anonymous';
    const now = Date.now();

    const clientData = operationCounts.get(clientId);

    if (!clientData || now > clientData.resetTime) {
      operationCounts.set(clientId, { count: 1, resetTime: now + windowMs });
    } else {
      if (clientData.count >= maxOperations) {
        return res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.'
        });
      }
      clientData.count++;
    }

    next();
  };
}

// Data integrity middleware
export function dataIntegrityMiddleware(
  integrityCheckFn: (data: any) => Array<{ issue: string; severity: 'error' | 'warning' }>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const data = (req as SanitizedRequest).sanitizedBody || req.body;

    const issues = integrityCheckFn(data);

    const errors = issues.filter(issue => issue.severity === 'error');
    const warnings = issues.filter(issue => issue.severity === 'warning');

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Data integrity check failed',
        errors: errors.map(e => e.issue)
      });
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('Data integrity warnings:', warnings.map(w => w.issue));
    }

    next();
  };
}