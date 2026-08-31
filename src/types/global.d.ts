// Type declarations for modules

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
