import { AxiosError } from 'axios';
import { toast } from '@/components/ui/use-toast';

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

export const handleError = (error: unknown, context?: string): void => {
  // Handle Axios errors
  if (error instanceof AxiosError) {
    const response = error.response?.data;
    const status = error.response?.status;
    const message = response?.message || error.message;
    
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
      case 422:
        // Handle validation errors (returned by the server)
        const validationErrors = response?.errors || {};
        return validationErrors;
      default:
        // Handle other HTTP errors
        toast({
          title: 'Error',
          description: message || 'An unexpected error occurred',
          variant: 'destructive',
        });
    }
    
    // Log the error
    console.error(`[API Error] ${status}:`, {
      message,
      url: error.config?.url,
      method: error.config?.method,
      context,
    });
    
    return;
  }
  
  // Handle custom AppError
  if (error instanceof AppError) {
    toast({
      title: 'Error',
      description: error.message,
      variant: 'destructive',
    });
    
    console.error(`[App Error] ${error.code || 'UNKNOWN'}:`, {
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
      context,
    });
    
    return;
  }
  
  // Handle unexpected errors
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  
  toast({
    title: 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
  
  console.error('[Unexpected Error]:', {
    error,
    context,
  });
};

// Error boundary handler
export const errorBoundaryHandler = (error: Error, errorInfo: React.ErrorInfo) => {
  console.error('Error Boundary caught an error:', error, errorInfo);
  
  // You can add error reporting service integration here
  // reportErrorToService(error, errorInfo);
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
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, context);
      throw error; // Re-throw to allow for further error handling if needed
    }
  };
};
