import { create } from 'zustand';
import { User } from '@/lib/schemas';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

export const useCurrentUser = () => {
  const { user } = useAuth();
  
  if (!user) {
    throw new Error('No user found. User must be logged in.');
  }
  
  return user;
};
