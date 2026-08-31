import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import authService from '@/lib/api/authService';
import { isRemoteEnabled } from '@/lib/database-service';
import { validateEmail } from '@/lib/security';

export interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'seafarer' | 'captain' | 'officer' | 'crew';
  name: string;
  companyId?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

type AuthContextType = {
  user: AppUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRemote: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (userData: Partial<AppUser>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const remote = isRemoteEnabled();

  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        const hasToken = !!localStorage.getItem('authToken');

        if (remote && hasToken) {
          const current = await authService.getCurrentUser();
          if (!cancelled) setUser(current as AppUser);
        } else if (!remote) {
          // In production the Cloudflare Worker is the source of truth for
          // authentication.  Without it there is no valid local session.
          if (!cancelled) setUser(null);
        } else if (hasToken) {
          // Token exists but backend was unavailable; clear it.
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          if (!cancelled) setUser(null);
        } else {
          if (!cancelled) setUser(null);
        }
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    checkAuth();
    return () => {
      cancelled = true;
    };
  }, [remote]);

  const login = useCallback(
    async (email: string, password: string) => {
      if (!email || !password) throw new Error('Email and password are required');
      if (!validateEmail(email)) throw new Error('Invalid email address');
      if (!remote) {
        throw new Error(
          'Authentication backend is not configured. Set VITE_API_BASE_URL to your Cloudflare Worker URL.',
        );
      }
      const response = await authService.login({ email, password });
      setUser(response.user as AppUser);
    },
    [remote],
  );

  const logout = useCallback(async () => {
    if (remote) {
      try {
        await authService.logout();
      } catch {
        // Local cleanup below is authoritative.
      }
    }
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }, [remote]);

  const updateUser = useCallback((userData: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...userData };
      localStorage.setItem('user', JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        isRemote: remote,
        login,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;
