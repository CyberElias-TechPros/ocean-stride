import { useCallback } from 'react';
import { handleError } from '@/lib/error-handler';

export const useApiErrorHandler = () => {
  const handleApiError = useCallback((error: unknown, context?: string) => {
    return handleError(error, context);
  }, []);

  const withErrorHandling = useCallback(
    async <T>(promise: Promise<T>, context?: string): Promise<T | undefined> => {
      try {
        return await promise;
      } catch (error) {
        handleError(error, context);
        throw error; // Re-throw to allow for further error handling if needed
      }
    },
    []
  );

  return {
    handleApiError,
    withErrorHandling,
  };
};
