// Core API client and services
export { default as apiClient } from './apiClient';
export { default as authService } from './authService';
export { default as userService } from './userService';
export { default as fleetService } from './fleetService';

// Types
export type { LoginCredentials, AuthResponse, RefreshTokenResponse } from './authService';

// Base service for extending
export { default as BaseService } from './baseService';

// Re-export commonly used axios types
export type { AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
