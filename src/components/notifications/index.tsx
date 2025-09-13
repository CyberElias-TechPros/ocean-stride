import React, { createContext, useContext, useCallback, useRef, useState, ReactNode } from 'react';
import { Toast, ToastAction, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from '@/components/ui/toast';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info';

export interface ToastOptions {
  id?: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  onDismiss?: () => void;
  autoDismiss?: boolean;
  dismissible?: boolean;
  className?: string;
}

export interface ToastItem extends ToastOptions {
  id: string;
  timestamp: number;
}

interface ToastContextType {
  addToast: (options: ToastOptions) => string;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const variantIcons = {
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
  default: '💬',
};

const variantClasses = {
  default: 'bg-background text-foreground border',
  destructive: 'destructive group border-destructive bg-destructive text-destructive-foreground',
  success: 'bg-green-50 border-green-200 text-green-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export const ToastProviderWrapper: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastRefs = useRef<Map<string, { dismiss: () => void }>>(new Map());

  const addToast = useCallback((options: ToastOptions): string => {
    const id = options.id || Math.random().toString(36).substring(2, 11);
    const timestamp = Date.now();
    
    const toast: ToastItem = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || 'default',
      duration: options.duration || 5000,
      action: options.action,
      onDismiss: options.onDismiss,
      autoDismiss: options.autoDismiss !== false,
      dismissible: options.dismissible !== false,
      className: options.className,
      timestamp,
    };

    setToasts((prevToasts) => {
      // Remove any existing toast with the same ID
      const filteredToasts = prevToasts.filter((t) => t.id !== id);
      return [...filteredToasts, toast];
    });

    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prevToasts) => {
      const toast = prevToasts.find((t) => t.id === id);
      if (toast?.onDismiss) {
        toast.onDismiss();
      }
      return prevToasts.filter((t) => t.id !== id);
    });
    toastRefs.current.delete(id);
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
    toastRefs.current.clear();
  }, []);

  const value = {
    addToast,
    removeToast,
    clearToasts,
  };

  return (
    <ToastProvider>
      <ToastContext.Provider value={value}>
        {children}
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            variant={toast.variant === 'destructive' ? 'destructive' : 'default'}
            duration={toast.duration}
            onOpenChange={(open) => {
              if (!open) {
                removeToast(toast.id);
              }
            }}
            className={cn(
              'relative flex flex-col items-start w-full max-w-md p-4 mb-2 rounded-lg shadow-lg',
              variantClasses[toast.variant || 'default'],
              toast.className
            )}
          >
            <div className="flex items-start w-full">
              {toast.variant && variantIcons[toast.variant] && (
                <span className="mr-3 text-lg">{variantIcons[toast.variant]}</span>
              )}
              <div className="flex-1">
                {toast.title && (
                  <ToastTitle className="text-sm font-medium">
                    {toast.title}
                  </ToastTitle>
                )}
                {toast.description && (
                  <ToastDescription className="mt-1 text-sm">
                    {toast.description}
                  </ToastDescription>
                )}
                {toast.action && (
                  <div className="mt-3">
                    <ToastAction
                      altText={toast.action.label}
                      onClick={toast.action.onClick}
                      className={cn(
                        'inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium rounded-md',
                        toast.variant === 'destructive' 
                          ? 'bg-white text-destructive hover:bg-destructive/10' 
                          : 'bg-foreground text-background hover:bg-foreground/90',
                        'focus:outline-none focus:ring-2 focus:ring-offset-2',
                        toast.variant === 'destructive' 
                          ? 'focus:ring-destructive' 
                          : 'focus:ring-foreground'
                      )}
                    >
                      {toast.action.label}
                    </ToastAction>
                  </div>
                )}
              </div>
              {toast.dismissible && (
                <button
                  type="button"
                  onClick={() => removeToast(toast.id)}
                  className={cn(
                    'ml-4 -mr-1.5 -mt-1.5 p-1.5 rounded-full transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-offset-2',
                    toast.variant === 'destructive'
                      ? 'text-destructive-foreground/50 hover:text-destructive-foreground focus:ring-destructive-foreground/20'
                      : 'text-foreground/50 hover:text-foreground focus:ring-foreground/20',
                    'hover:bg-black/5 dark:hover:bg-white/10'
                  )}
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Toast>
        ))}
        <ToastViewport className="fixed bottom-0 right-0 z-[100] flex flex-col p-4 gap-2 w-full max-w-sm m-0" />
      </ToastContext.Provider>
    </ToastProvider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Toast shortcut functions
export const toast = {
  success: (options: Omit<ToastOptions, 'variant'>) => 
    useToast().addToast({ ...options, variant: 'success' }),
  error: (options: Omit<ToastOptions, 'variant'>) => 
    useToast().addToast({ ...options, variant: 'destructive' }),
  warning: (options: Omit<ToastOptions, 'variant'>) => 
    useToast().addToast({ ...options, variant: 'warning' }),
  info: (options: Omit<ToastOptions, 'variant'>) => 
    useToast().addToast({ ...options, variant: 'info' }),
  default: (options: ToastOptions) => 
    useToast().addToast({ ...options, variant: 'default' }),
  dismiss: (id: string) => useToast().removeToast(id),
  clear: () => useToast().clearToasts(),
};

export default ToastProviderWrapper;
