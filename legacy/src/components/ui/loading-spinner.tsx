import React from 'react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'muted' | 'white';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  className,
  size = 'md', 
  color = 'primary',
  ...props
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-2',
  };

  const colorClasses = {
    primary: 'border-t-primary-500 border-r-primary-500/30 border-b-primary-500/30 border-l-primary-500/30',
    secondary: 'border-t-secondary-500 border-r-secondary-500/30 border-b-secondary-500/30 border-l-secondary-500/30',
    muted: 'border-t-muted-foreground/70 border-r-muted-foreground/20 border-b-muted-foreground/20 border-l-muted-foreground/20',
    white: 'border-t-white border-r-white/30 border-b-white/30 border-l-white/30',
  };

  return (
    <div 
      className={cn(
        'inline-block animate-spin rounded-full',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label="Loading..."
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;
