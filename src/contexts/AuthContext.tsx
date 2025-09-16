import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
// Removed useNavigate from here as it should be used in components

type User = {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'seafarer';
  name: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (userData: Partial<User>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Removed direct useNavigate from here

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // TODO: Replace with actual session check
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check failed', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      // Mock API call - replace with actual API call
      return new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          if (email && password) {
            const mockUser: User = {
              id: '1',
              email,
              role: 'admin',
              name: email.split('@')[0],
            };
            setUser(mockUser);
            localStorage.setItem('user', JSON.stringify(mockUser));
            console.log('User logged in:', email);
            resolve();
          } else {
            reject(new Error('Invalid credentials'));
          }
        }, 1000);
      });
      console.log('User logged in:', email);
      
      // Navigation is handled by the ProtectedRoute component
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    console.log('User logged out');
    // The actual navigation will be handled by the ProtectedRoute component
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
    console.log('User updated:', user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
