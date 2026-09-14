import apiClient from './apiClient';
import { User, LoginCredentials, AuthResponse, RefreshTokenResponse } from '@/types';


const authService = {
  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
      // Store tokens
      localStorage.setItem('authToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      return response.data;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  },

  /**
   * Logout the current user
   */
  async logout(): Promise<void> {
    try {
      // Call the logout endpoint to invalidate the token
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      // Clear tokens and user data regardless of the API call result
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  },

  /**
   * Refresh the access token using the refresh token
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await apiClient.post<RefreshTokenResponse>('/auth/refresh-token', {
        refreshToken,
      });

      // Update stored tokens
      localStorage.setItem('authToken', response.data.accessToken);
      if (response.data.refreshToken) {
        localStorage.setItem('refreshToken', response.data.refreshToken);
      }

      return response.data;
    } catch (error) {
      console.error('Failed to refresh token:', error);
      // Clear tokens if refresh fails
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      throw error;
    }
  },

  /**
   * Request a password reset email
   */
  async forgotPassword(email: string): Promise<void> {
    try {
      await apiClient.post('/auth/forgot-password', { email });
    } catch (error) {
      console.error('Password reset request failed:', error);
      throw error;
    }
  },

  /**
   * Reset password with a valid reset token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        password,
      });
    } catch (error) {
      console.error('Password reset failed:', error);
      throw error;
    }
  },

  /**
   * Get the current user's profile
   */
  async getCurrentUser(): Promise<User> {
    try {
      const response = await apiClient.get<User>('/auth/me');
      // Update stored user data
      localStorage.setItem('user', JSON.stringify(response.data));
      return response.data;
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      throw error;
    }
  },
};

export default authService;
