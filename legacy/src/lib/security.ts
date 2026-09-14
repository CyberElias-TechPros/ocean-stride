// Security utilities for client-side application hardening

// Input sanitization functions
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
};

export const sanitizeHtml = (html: string): string => {
  if (typeof html !== 'string') return '';

  // Basic HTML sanitization - allow only safe tags
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li', 'a'];
  const allowedAttributes = ['href', 'target', 'rel'];

  return html.replace(/<([^>]+)>/g, (match, tagContent) => {
    const tagMatch = tagContent.match(/^\/?([a-zA-Z][a-zA-Z0-9]*)/);
    if (!tagMatch) return '';

    const tagName = tagMatch[1].toLowerCase();
    if (!allowedTags.includes(tagName)) return '';

    // For anchor tags, sanitize href
    if (tagName === 'a') {
      return match.replace(/href\s*=\s*["']([^"']*)["']/gi, (hrefMatch, url) => {
        if (url.startsWith('javascript:') || url.startsWith('data:')) return '';
        return `href="${url}"`;
      });
    }

    return match;
  });
};

// Enhanced input validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

export const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (password.length < 8) errors.push('Password must be at least 8 characters long');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/\d/.test(password)) errors.push('Password must contain at least one number');
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) errors.push('Password must contain at least one special character');

  return { isValid: errors.length === 0, errors };
};

export const validatePhoneNumber = (phone: string): boolean => {
  // Remove all non-digit characters
  const digitsOnly = phone.replace(/\D/g, '');
  // Check if it's a valid length (10-15 digits for international numbers)
  return digitsOnly.length >= 10 && digitsOnly.length <= 15;
};

export const validateUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return ['http:', 'https:'].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

// CSRF protection utilities
class CSRFProtection {
  private static token: string | null = null;
  private static tokenExpiry: number | null = null;

  static generateToken(): string {
    const token = crypto.randomUUID();
    this.token = token;
    this.tokenExpiry = Date.now() + (15 * 60 * 1000); // 15 minutes
    return token;
  }

  static getToken(): string {
    if (!this.token || (this.tokenExpiry && Date.now() > this.tokenExpiry)) {
      return this.generateToken();
    }
    return this.token;
  }

  static validateToken(token: string): boolean {
    return this.token === token && (!this.tokenExpiry || Date.now() <= this.tokenExpiry);
  }

  static clearToken(): void {
    this.token = null;
    this.tokenExpiry = null;
  }
}

export { CSRFProtection };

// Rate limiting for API calls
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
}

class RateLimiter {
  private requests: number[] = [];

  constructor(private config: RateLimitConfig) {}

  isAllowed(): boolean {
    const now = Date.now();
    // Remove old requests outside the time window
    this.requests = this.requests.filter(timestamp => now - timestamp < this.config.windowMs);

    if (this.requests.length < this.config.maxRequests) {
      this.requests.push(now);
      return true;
    }

    return false;
  }

  getRemainingRequests(): number {
    const now = Date.now();
    this.requests = this.requests.filter(timestamp => now - timestamp < this.config.windowMs);
    return Math.max(0, this.config.maxRequests - this.requests.length);
  }

  getResetTime(): number {
    if (this.requests.length === 0) return 0;
    return this.requests[0] + this.config.windowMs;
  }
}

// API rate limiter instances
const apiRateLimiter = new RateLimiter({ maxRequests: 100, windowMs: 60000 }); // 100 requests per minute
const authRateLimiter = new RateLimiter({ maxRequests: 5, windowMs: 300000 }); // 5 auth attempts per 5 minutes

export const checkApiRateLimit = (): boolean => apiRateLimiter.isAllowed();
export const checkAuthRateLimit = (): boolean => authRateLimiter.isAllowed();

export const getApiRateLimitInfo = () => ({
  remaining: apiRateLimiter.getRemainingRequests(),
  resetTime: apiRateLimiter.getResetTime(),
});

export const getAuthRateLimitInfo = () => ({
  remaining: authRateLimiter.getRemainingRequests(),
  resetTime: authRateLimiter.getResetTime(),
});

// Audit logging for sensitive operations
interface AuditLog {
  id: string;
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent: string;
  success: boolean;
}

const AUDIT_STORAGE_KEY = 'app_audit_logs';
const MAX_AUDIT_LOGS = 1000;

export const logAuditEvent = (event: Omit<AuditLog, 'id' | 'timestamp' | 'userAgent'>): void => {
  try {
    const auditEvent: AuditLog = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      userAgent: navigator.userAgent,
    };

    const existingLogs = getAuditLogs();
    existingLogs.push(auditEvent);

    // Keep only recent logs
    if (existingLogs.length > MAX_AUDIT_LOGS) {
      existingLogs.splice(0, existingLogs.length - MAX_AUDIT_LOGS);
    }

    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(existingLogs));
  } catch (error) {
    console.error('Failed to store audit log:', error);
  }
};

export const getAuditLogs = (): AuditLog[] => {
  try {
    const stored = localStorage.getItem(AUDIT_STORAGE_KEY);
    return stored ? JSON.parse(stored).map((log: any) => ({ ...log, timestamp: new Date(log.timestamp) })) : [];
  } catch {
    return [];
  }
};

export const clearAuditLogs = (): void => {
  localStorage.removeItem(AUDIT_STORAGE_KEY);
};

// Data encryption for sensitive information
class DataEncryption {
  private static key: CryptoKey | null = null;
  private static readonly algorithm = { name: 'AES-GCM', length: 256 };

  static async initializeKey(): Promise<void> {
    if (this.key) return;

    try {
      // Generate or retrieve encryption key
      let keyData = localStorage.getItem('encryption_key');
      if (!keyData) {
        const key = await crypto.subtle.generateKey(this.algorithm, true, ['encrypt', 'decrypt']);
        const exportedKey = await crypto.subtle.exportKey('raw', key);
        keyData = btoa(String.fromCharCode(...new Uint8Array(exportedKey)));
        localStorage.setItem('encryption_key', keyData);
        this.key = key;
      } else {
        const keyBuffer = Uint8Array.from(atob(keyData), c => c.charCodeAt(0));
        this.key = await crypto.subtle.importKey('raw', keyBuffer, this.algorithm, true, ['encrypt', 'decrypt']);
      }
    } catch (error) {
      console.error('Failed to initialize encryption key:', error);
      throw new Error('Encryption initialization failed');
    }
  }

  static async encrypt(data: string): Promise<string> {
    await this.initializeKey();
    if (!this.key) throw new Error('Encryption key not available');

    try {
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        this.key,
        dataBuffer
      );

      const encryptedArray = new Uint8Array(encrypted);
      const combined = new Uint8Array(iv.length + encryptedArray.length);
      combined.set(iv);
      combined.set(encryptedArray, iv.length);

      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Data encryption failed');
    }
  }

  static async decrypt(encryptedData: string): Promise<string> {
    await this.initializeKey();
    if (!this.key) throw new Error('Encryption key not available');

    try {
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);

      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        this.key,
        encrypted
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Data decryption failed');
    }
  }
}

// Secure storage wrapper
export class SecureStorage {
  static async setItem(key: string, value: string, encrypt: boolean = false): Promise<void> {
    try {
      const dataToStore = encrypt ? await DataEncryption.encrypt(value) : value;
      localStorage.setItem(key, dataToStore);

      // Audit log for sensitive data storage
      if (encrypt) {
        logAuditEvent({
          userId: localStorage.getItem('user_id') || undefined,
          action: 'secure_storage_set',
          resource: key,
          success: true,
        });
      }
    } catch (error) {
      logAuditEvent({
        userId: localStorage.getItem('user_id') || undefined,
        action: 'secure_storage_set',
        resource: key,
        success: false,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });
      throw error;
    }
  }

  static async getItem(key: string, encrypted: boolean = false): Promise<string | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      return encrypted ? await DataEncryption.decrypt(stored) : stored;
    } catch (error) {
      console.error('Failed to retrieve secure storage item:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    localStorage.removeItem(key);

    // Audit log for sensitive data removal
    logAuditEvent({
      userId: localStorage.getItem('user_id') || undefined,
      action: 'secure_storage_remove',
      resource: key,
      success: true,
    });
  }
}

// Content Security Policy helper
export const generateCSP = (): string => {
  const policies = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "media-src 'self'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  return policies.join('; ');
};

// Security headers helper (for server-side, but useful for documentation)
export const getSecurityHeaders = () => ({
  'Content-Security-Policy': generateCSP(),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
});

// Initialize security features
export const initializeSecurity = (): void => {
  // Set up CSP if supported
  if ('csp' in document) {
    // Note: CSP should be set via meta tag or HTTP headers
  }

  // Prevent common security issues
  document.addEventListener('contextmenu', (e) => {
    // Allow context menu in development
    if (process.env.NODE_ENV === 'production') {
      e.preventDefault();
    }
  });

  // Prevent drag and drop of external content
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => e.preventDefault());
};