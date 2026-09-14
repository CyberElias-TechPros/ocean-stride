import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { useAuthStore } from '@/store';
import { Spinner } from '@/components/ui/spinner';

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Authentication check failed:', error);
        if (window.location.pathname !== ROUTES.LOGIN) {
          navigate(ROUTES.LOGIN, { replace: true });
        }
      }
    };

    initializeAuth();
  }, [checkAuth, navigate]);

  // Show loading state while checking auth status
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
};
