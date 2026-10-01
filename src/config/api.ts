const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:3000/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    ME: '/auth/me',
  },
  USERS: {
    BASE: '/users',
    BY_ID: (id: string) => `/users/${id}`,
    PROFILE: (id: string) => `/users/${id}/profile`,
    ROLES: (id: string) => `/users/${id}/roles`,
  },
  VESSELS: {
    BASE: '/vessels',
    BY_ID: (id: string) => `/vessels/${id}`,
    CREW: (id: string) => `/vessels/${id}/crew`,
    MAINTENANCE: (id: string) => `/vessels/${id}/maintenance`,
  },
  CREW: {
    BASE: '/crew',
    BY_ID: (id: string) => `/crew/${id}`,
    CERTIFICATIONS: (id: string) => `/crew/${id}/certifications`,
    ASSIGNMENTS: (id: string) => `/crew/${id}/assignments`,
  },
  DOCUMENTS: {
    BASE: '/documents',
    BY_ID: (id: string) => `/documents/${id}`,
    UPLOAD: '/documents/upload',
    DOWNLOAD: (id: string) => `/documents/${id}/download`,
  },
  REPORTS: {
    BASE: '/reports',
    GENERATE: '/reports/generate',
    DOWNLOAD: (id: string) => `/reports/${id}/download`,
  },
};

export const getApiUrl = (path: string): string => {
  return `${API_BASE_URL}${path}`;
};
