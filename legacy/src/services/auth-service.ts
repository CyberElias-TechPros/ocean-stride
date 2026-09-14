import { BaseApi } from '@/lib/api/base-api';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import { setAuthToken, removeAuthToken, isTokenExpired } from '@/lib/auth';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  // Add other registration fields as needed
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    // Add other user fields as needed
  };
}

export class AuthService extends BaseApi {
  [x: string]: any;
  constructor() {
    super(getApiUrl(''));
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>(
      API_ENDPOINTS.AUTH.REGISTER,
      data
    );
    
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    
    return response;
  }

  async refreshToken(): Promise<{ accessToken: string }> {
    const response = await this.post<{ accessToken: string }>(
      API_ENDPOINTS.AUTH.REFRESH
    );
    
    if (response.accessToken) {
      setAuthToken(response.accessToken);
    }
    
    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post(API_ENDPOINTS.AUTH.LOGOUT);
    } finally {
      this.clearAuth();
    }
  }

  async getCurrentUser(): Promise<AuthResponse['user']> {
    const response = await this.get<{ user: AuthResponse['user'] }>(
      API_ENDPOINTS.AUTH.ME
    );
    return response.user;
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('auth_token');
    return !!token && !isTokenExpired(token);
  }

  clearAuth(): void {
    removeAuthToken();
  }
}

export const authService = new AuthService();
