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
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          // Validate stored user data
          if (user.id && user.email && user.role && user.name) {
            setUser(user);
          } else {
            // Clear invalid stored data
            localStorage.removeItem('user');
          }
        }
      } catch (error) {
        console.error('Auth check failed', error);
        localStorage.removeItem('user'); // Clear corrupted data
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Validate credentials
      if (!email || !password) {
        throw new Error('Email and password are required');
      }

      // For now, accept any valid email/password combination
      // In production, this would validate against a user database
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        throw new Error('Invalid email format');
      }

      if (password.length < 3) {
        throw new Error('Password must be at least 3 characters');
      }

      // Create user based on email domain logic
      const user: User = {
        id: btoa(email), // Use base64 encoded email as ID
        email,
        role: email.includes('admin') ? 'admin' : 'manager',
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      };

      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
      console.log('User logged in:', email);
      
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
