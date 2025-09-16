import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { toast } from '@/components/ui/use-toast';
import { ROUTES } from '@/config/routes';
import { ApiError } from '@/types';

// Extend the default AxiosRequestConfig to include _retry
interface RetryConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Create a custom Axios instance with default config
const apiClient: AxiosInstance = axios.create({
  baseURL: import.meta.env['VITE_API_BASE_URL'] || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.set('Authorization', `Bearer ${token}`, true);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<{ message?: string }>) => {
    const originalRequest = error.config as RetryConfig;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Import authService here to avoid circular dependency
        const { authService } = await import('./authService');
        const response = await authService.refreshToken();
        const { accessToken } = response;
        
        // Store the new token
        localStorage.setItem('authToken', accessToken);
        
        // Retry the original request
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return apiClient(originalRequest);
      } catch (refreshError) {
        // If refresh fails, redirect to login
        localStorage.removeItem('authToken');
        window.location.href = ROUTES.LOGIN;
        return Promise.reject(refreshError);
      }
    }
    
    // Handle other errors
    if (error.response) {
      const errorMessage = error.response.data?.message || 'An error occurred';
      const errorData = error.response.data as ApiError;
      
      // Show error toast for non-401 errors
      if (error.response.status !== 401) {
        toast({
          title: 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
      }
      
      return Promise.reject({
        status: error.response.status,
        message: errorMessage,
        ...(errorData || {}),
      });
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
