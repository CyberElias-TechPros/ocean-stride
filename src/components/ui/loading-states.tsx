import React from 'react';
import { LoadingSpinner } from './loading-spinner';
import { Skeleton } from './skeleton';
import { cn } from '@/lib/utils';

// Page-level loading state
interface PageLoadingProps {
  message?: string;
  className?: string;
}

export const PageLoading: React.FC<PageLoadingProps> = ({
  message = 'Loading...',
  className
}) => {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center min-h-[400px] space-y-4',
      className
    )}>
      <LoadingSpinner size="lg" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
};

// Inline loading state for buttons/forms
interface InlineLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const InlineLoading: React.FC<InlineLoadingProps> = ({
  message,
  size = 'sm',
  className
}) => {
  return (
    <div className={cn('flex items-center space-x-2', className)}>
      <LoadingSpinner size={size} />
      {message && <span className="text-sm text-muted-foreground">{message}</span>}
    </div>
  );
};

// Button loading state
interface ButtonLoadingProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
}

export const ButtonLoading: React.FC<ButtonLoadingProps> = ({
  loading,
  children,
  loadingText = 'Loading...',
  disabled,
  className,
  onClick
}) => {
  return (
    <button
      className={className}
      disabled={loading || disabled}
      onClick={onClick}
    >
      {loading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" color="white" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
};

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rows = 5,
  columns = 4,
  className
}) => {
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header skeleton */}
      <div className="flex space-x-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton
              key={`cell-${rowIndex}-${colIndex}`}
              className="h-4 flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// Card skeleton
interface CardSkeletonProps {
  lines?: number;
  showAvatar?: boolean;
  className?: string;
}

export const CardSkeleton: React.FC<CardSkeletonProps> = ({
  lines = 3,
  showAvatar = false,
  className
}) => {
  return (
    <div className={cn('p-4 border rounded-lg space-y-3', className)}>
      {showAvatar && (
        <div className="flex items-center space-x-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
};

// Form skeleton
interface FormSkeletonProps {
  fields?: number;
  className?: string;
}

export const FormSkeleton: React.FC<FormSkeletonProps> = ({
  fields = 4,
  className
}) => {
  return (
    <div className={cn('space-y-6', className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-1/4" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}

      <div className="flex space-x-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-20" />
      </div>
    </div>
  );
};

// List skeleton
interface ListSkeletonProps {
  items?: number;
  showAvatar?: boolean;
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  items = 5,
  showAvatar = false,
  className
}) => {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center space-x-3">
          {showAvatar && <Skeleton className="h-8 w-8 rounded-full" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

// Chart skeleton
interface ChartSkeletonProps {
  bars?: number;
  className?: string;
}

export const ChartSkeleton: React.FC<ChartSkeletonProps> = ({
  bars = 8,
  className
}) => {
  return (
    <div className={cn('flex items-end space-x-2 h-32', className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-8"
          style={{ height: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  );
};

// Loading overlay for existing content
interface LoadingOverlayProps {
  loading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  loading,
  message,
  children,
  className
}) => {
  return (
    <div className={cn('relative', className)}>
      {children}
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-2">
            <LoadingSpinner size="lg" />
            {message && <p className="text-sm text-muted-foreground">{message}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

// Progressive loading hook
export function useProgressiveLoading() {
  const [loadedItems, setLoadedItems] = React.useState<Set<string>>(new Set());

  const markLoaded = React.useCallback((key: string) => {
    setLoadedItems(prev => new Set(prev).add(key));
  }, []);

  const isLoaded = React.useCallback((key: string) => {
    return loadedItems.has(key);
  }, [loadedItems]);

  return { markLoaded, isLoaded };
}

// Progressive loading component
interface ProgressiveLoadingProps {
  items: Array<{ key: string; component: React.ReactNode }>;
  loadingComponent?: React.ReactNode;
  className?: string;
}

export const ProgressiveLoading: React.FC<ProgressiveLoadingProps> = ({
  items,
  loadingComponent,
  className
}) => {
  const { markLoaded, isLoaded } = useProgressiveLoading();

  React.useEffect(() => {
    items.forEach((item, index) => {
      const timer = setTimeout(() => {
        markLoaded(item.key);
      }, index * 100); // Stagger loading by 100ms

      return () => clearTimeout(timer);
    });
  }, [items, markLoaded]);

  return (
    <div className={className}>
      {items.map(item => (
        <div key={item.key}>
          {isLoaded(item.key) ? item.component : (loadingComponent || <Skeleton className="h-4 w-full" />)}
        </div>
      ))}
    </div>
  );
};