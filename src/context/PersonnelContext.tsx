import { createContext, useContext, ReactNode } from 'react';
import { usePersonnelManagement } from '@/hooks/usePersonnelManagement';

type PersonnelManagementReturn = ReturnType<typeof usePersonnelManagement>;

// Create the context with a default undefined value
const PersonnelContext = createContext<PersonnelManagementReturn | undefined>(undefined);

type PersonnelProviderProps = {
  children: ReactNode;
  companyId: string;
  userId: string;
};

export function PersonnelProvider({ children, companyId, userId }: PersonnelProviderProps) {
  const personnel = usePersonnelManagement({ companyId, userId });
  
  return (
    <PersonnelContext.Provider value={personnel}>
      {children}
    </PersonnelContext.Provider>
  );
}

export function usePersonnel() {
  const context = useContext(PersonnelContext);
  if (context === undefined) {
    throw new Error('usePersonnel must be used within a PersonnelProvider');
  }
  return context;
}
