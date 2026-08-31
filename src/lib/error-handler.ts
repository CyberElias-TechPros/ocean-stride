import { AxiosError } from 'axios';
import { toast } from '@/components/ui/use-toast';

// Types for error tracking
interface ErrorLog {
  id: string;
  timestamp: Date;
  level: 'error' | 'warning' | 'info';
  message: string;
  context?: string;
  userId?: string;
  userAgent: string;
  url: string;
  stack?: string;
  details?: unknown;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: Date;
  context?: string;
}

interface UserActivity {
  id: string;
  timestamp: Date;
  action: string;
  details?: Record<string, unknown>;
  userId?: string;
  sessionId: string;
}

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  checks: {
    network: boolean;
    storage: boolean;
    memory: boolean;
    performance: boolean;
  };
  metrics: {
    memoryUsage?: number;
    networkLatency?: number;
    renderTime?: number;
  };
}

// Error tracking storage
const ERROR_STORAGE_KEY = 'app_error_logs';
const MAX_ERROR_LOGS = 100;

// Performance monitoring
const PERFORMANCE_STORAGE_KEY = 'app_performance_metrics';
const MAX_PERFORMANCE_METRICS = 500;

// User activity logging
const ACTIVITY_STORAGE_KEY = 'app_user_activity';
const MAX_ACTIVITY_LOGS = 1000;

// Health check interval
let healthCheckInterval: NodeJS.Timeout | null = null;

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Error tracking functions
export const logError = (error: ErrorLog): void => {
  try {
    const existingLogs = getStoredErrorLogs();
    existingLogs.unshift(error);

    // Keep only the most recent logs
    if (existingLogs.length > MAX_ERROR_LOGS) {
      existingLogs.splice(MAX_ERROR_LOGS);
    }

    localStorage.setItem(ERROR_STORAGE_KEY, JSON.stringify(existingLogs));

    // Send to external service if configured
    sendErrorToService(error);
  } catch (storageError) {
    console.error('Failed to store error log:', storageError);
  }
};

export const getStoredErrorLogs = (): ErrorLog[] => {
  try {
    const stored = localStorage.getItem(ERROR_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const clearErrorLogs = (): void => {
  localStorage.removeItem(ERROR_STORAGE_KEY);
};

// Performance monitoring
export const logPerformanceMetric = (metric: PerformanceMetric): void => {
  try {
    const existingMetrics = getStoredPerformanceMetrics();
    existingMetrics.push(metric);

    // Keep only recent metrics
    if (existingMetrics.length > MAX_PERFORMANCE_METRICS) {
      existingMetrics.splice(0, existingMetrics.length - MAX_PERFORMANCE_METRICS);
    }

    localStorage.setItem(PERFORMANCE_STORAGE_KEY, JSON.stringify(existingMetrics));
  } catch (storageError) {
    console.error('Failed to store performance metric:', storageError);
  }
};

export const getStoredPerformanceMetrics = (): PerformanceMetric[] => {
  try {
    const stored = localStorage.getItem(PERFORMANCE_STORAGE_KEY);
    return stored ? JSON.parse(stored).map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })) : [];
  } catch {
    return [];
  }
};

// User activity logging
export const logUserActivity = (activity: Omit<UserActivity, 'id' | 'timestamp' | 'sessionId'>): void => {
  try {
    const sessionId = getSessionId();
    const userActivity: UserActivity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date(),
      sessionId,
    };

    const existingActivities = getStoredUserActivities();
    existingActivities.push(userActivity);

    // Keep only recent activities
    if (existingActivities.length > MAX_ACTIVITY_LOGS) {
      existingActivities.splice(0, existingActivities.length - MAX_ACTIVITY_LOGS);
    }

    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(existingActivities));
  } catch (storageError) {
    console.error('Failed to store user activity:', storageError);
  }
};

export const getStoredUserActivities = (): UserActivity[] => {
  try {
    const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    return stored ? JSON.parse(stored).map((a: any) => ({ ...a, timestamp: new Date(a.timestamp) })) : [];
  } catch {
    return [];
  }
};

export const getSessionId = (): string => {
  let sessionId = sessionStorage.getItem('app_session_id');
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem('app_session_id', sessionId);
  }
  return sessionId;
};

// Health check functions
export const performHealthCheck = async (): Promise<HealthCheckResult> => {
  const checks = {
    network: false,
    storage: false,
    memory: false,
    performance: false,
  };

  const metrics: HealthCheckResult['metrics'] = {};

  // Network check
  try {
    const start = performance.now();
    await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
    const end = performance.now();
    checks.network = true;
    metrics.networkLatency = end - start;
  } catch {
    checks.network = false;
  }

  // Storage check
  try {
    const testKey = 'health_check_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    checks.storage = true;
  } catch {
    checks.storage = false;
  }

  // Memory check (if available)
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    metrics.memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
    checks.memory = metrics.memoryUsage < 0.9; // Less than 90% usage
  } else {
    checks.memory = true; // Assume healthy if not available
  }

  // Performance check
  try {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigation) {
      metrics.renderTime = navigation.loadEventEnd - navigation.fetchStart;
      checks.performance = metrics.renderTime < 5000; // Less than 5 seconds
    } else {
      checks.performance = true;
    }
  } catch {
    checks.performance = true;
  }

  const allChecksPass = Object.values(checks).every(Boolean);
  const status: HealthCheckResult['status'] = allChecksPass ? 'healthy' :
    Object.values(checks).some(Boolean) ? 'degraded' : 'unhealthy';

  const result: HealthCheckResult = {
    status,
    timestamp: new Date(),
    checks,
    metrics,
  };

  // Log health check result
  if (status !== 'healthy') {
    logError({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: status === 'unhealthy' ? 'error' : 'warning',
      message: `Health check failed: ${status}`,
      context: 'health_check',
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: result,
    });
  }

  return result;
};

export const startHealthChecks = (intervalMs: number = 300000): void => { // 5 minutes default
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
  }

  healthCheckInterval = setInterval(async () => {
    await performHealthCheck();
  }, intervalMs);
};

export const stopHealthChecks = (): void => {
  if (healthCheckInterval) {
    clearInterval(healthCheckInterval);
    healthCheckInterval = null;
  }
};

// Crash reporting and recovery
export const setupCrashReporting = (): void => {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: 'error',
      message: 'Unhandled promise rejection',
      context: 'crash_reporting',
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: {
        reason: event.reason,
        promise: event.promise,
      },
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    logError({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: 'error',
      message: event.message,
      context: 'crash_reporting',
      userAgent: navigator.userAgent,
      url: window.location.href,
      stack: event.error?.stack,
      details: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
      },
    });
  });

  // Performance observer for long tasks
  if ('PerformanceObserver' in window) {
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) { // Long task > 50ms
            logPerformanceMetric({
              name: 'long_task',
              value: entry.duration,
              timestamp: new Date(),
              context: 'performance_observer',
            });
          }
        }
      });
      observer.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('Performance observer not supported:', error);
    }
  }
};

// Send error to external service (placeholder for Sentry, LogRocket, etc.)
const sendErrorToService = (error: ErrorLog): void => {
  // Placeholder - integrate with actual error reporting service
  if (import.meta.env.PROD) {
    // Example: send to Sentry, LogRocket, etc.
    console.log('Sending error to external service:', error);
  }
};

export const handleError = (error: unknown, context?: string): void => {
  const userId: string | undefined = localStorage.getItem('user_id') ?? undefined; // Assuming user ID is stored

  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response?.data;
    const status = error.response?.status;
    const message = response?.message || error.message;

    // Log the error
    logError({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: 'error',
      message: `[API Error] ${status}: ${message}`,
      context: context || 'api_call',
      userId,
      userAgent: navigator.userAgent,
      url: error.config?.url || window.location.href,
      details: {
        status,
        method: error.config?.method,
        url: error.config?.url,
        response: response,
      },
    });

    // Handle specific HTTP status codes
    switch (status) {
      case 401:
        // Handle unauthorized (e.g., redirect to login)
        // You might want to clear auth state here
        break;
      case 403:
        // Handle forbidden
        toast({
          title: 'Access Denied',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
        break;
      case 404:
        // Handle not found
        toast({
          title: 'Not Found',
          description: message || 'The requested resource was not found.',
          variant: 'destructive',
        });
        break;
      case 422: {
        // Handle validation errors (returned by the server)
        const validationErrors = response?.errors || {};
        return validationErrors;
      }
      default:
        // Handle other HTTP errors
        toast({
          title: 'Error',
          description: message || 'An unexpected error occurred',
          variant: 'destructive',
        });
    }

    return;
  }

  // Handle custom AppError
  if (error instanceof AppError) {
    logError({
      id: crypto.randomUUID(),
      timestamp: new Date(),
      level: 'error',
      message: error.message,
      context: context || 'app_error',
      userId,
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: {
        code: error.code,
        statusCode: error.statusCode,
        appErrorDetails: error.details,
      },
    });

    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });

    return;
  }

  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';

  logError({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    level: 'error',
    message: errorMessage,
    context: context || 'unexpected_error',
    userId,
    userAgent: navigator.userAgent,
    url: window.location.href,
    stack: error instanceof Error ? error.stack : undefined,
    details: error,
  });

  toast({
    title: 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
};

// Error boundary handler
export const errorBoundaryHandler = (error: Error, errorInfo: React.ErrorInfo) => {
  logError({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    level: 'error',
    message: 'React Error Boundary: ' + error.message,
    context: 'error_boundary',
    userAgent: navigator.userAgent,
    url: window.location.href,
    stack: error.stack,
    details: errorInfo,
  });

  // You can add error reporting service integration here
  sendErrorToService({
    id: crypto.randomUUID(),
    timestamp: new Date(),
    level: 'error',
    message: 'React Error Boundary: ' + error.message,
    context: 'error_boundary',
    userAgent: navigator.userAgent,
    url: window.location.href,
    stack: error.stack,
    details: errorInfo,
  });
};

// API error handler for React Query
export const queryErrorHandler = (error: unknown) => {
  handleError(error, 'React Query');
};

// Create a wrapper for async functions with error handling
export const withErrorHandling = <T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: string
) => {
  return async (...args: Parameters<T>): Promise<Awaited<ReturnType<T>> | undefined> => {
    const startTime = performance.now();
    try {
      const result = await fn(...args);
      const endTime = performance.now();

      // Log performance metric
      logPerformanceMetric({
        name: 'async_operation',
        value: endTime - startTime,
        timestamp: new Date(),
        context: context || 'async_wrapper',
      });

      return result;
    } catch (error) {
      const endTime = performance.now();

      // Log failed operation
      logPerformanceMetric({
        name: 'async_operation_failed',
        value: endTime - startTime,
        timestamp: new Date(),
        context: context || 'async_wrapper',
      });

      handleError(error, context);
      throw error; // Re-throw to allow for further error handling if needed
    }
  };
};

// Initialize monitoring on module load
if (typeof window !== 'undefined') {
  setupCrashReporting();
  startHealthChecks();
}
