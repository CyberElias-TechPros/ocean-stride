// Type declarations for modules

declare module '@/hooks/use-company' {
  import { Company } from '@/lib/schemas';
  
  export interface CompanyState {
    company: Company | null;
    setCompany: (company: Company | null) => void;
    clearCompany: () => void;
  }
  
  export const useCompany: () => CompanyState;
  export const useCurrentCompany: () => Company;
}

declare module '@/hooks/use-auth' {
  import { User } from '@/lib/schemas';
  
  export interface AuthState {
    user: User | null;
    isAuthenticated: boolean;
    login: (user: User) => void;
    logout: () => void;
  }
  
  export const useAuth: () => AuthState;
  export const useCurrentUser: () => User;
}

declare module '@/context/DatabaseContext' {
  import { ReactNode } from 'react';
  
  export interface DatabaseContextType {
    isInitialized: boolean;
    error: Error | null;
    refresh: () => Promise<void>;
  }
  
  export const DatabaseProvider: React.FC<{ children: ReactNode }>;
  export const useDatabase: () => DatabaseContextType;
}

declare module '@/hooks/use-media-query' {
  export function useMediaQuery(query: string): boolean;
}
