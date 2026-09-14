import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';

type FormTextareaProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  textareaClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  required?: boolean;
  disabled?: boolean;
  rows?: number;
  maxLength?: number;
  showCharCount?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function FormTextarea({
  name,
  label,
  description,
  placeholder,
  className,
  textareaClassName,
  labelClassName,
  descriptionClassName,
  required = false,
  disabled = false,
  rows = 3,
  maxLength,
  showCharCount = false,
  ...props
}: FormTextareaProps) {
  const { register, watch, formState: { errors } } = useFormContext();
  const error = errors[name];
  const value = watch(name) || '';
  const charCount = typeof value === 'string' ? value.length : 0;
  
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label
          htmlFor={name}
          className={cn(
            'block text-sm font-medium text-gray-700 dark:text-gray-300',
            error && 'text-destructive',
            labelClassName
          )}
        >
          {label}
          {required && <span className="ml-1 text-destructive">*</span>}
        </label>
      )}
      
      <div className="relative">
        <textarea
          id={name}
          placeholder={placeholder}
          disabled={disabled}
          rows={rows}
          maxLength={maxLength}
          className={cn(
            'flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus-visible:ring-destructive/50',
            textareaClassName
          )}
          {...register(name)}
          {...props}
        />
        
        {(showCharCount || maxLength) && (
          <div className="mt-1 flex justify-end">
            <span className="text-xs text-muted-foreground">
              {charCount}{maxLength ? `/${maxLength}` : ''}
            </span>
          </div>
        )}
      </div>
      
      {description && !error && (
        <p className={cn('text-sm text-muted-foreground', descriptionClassName)}>
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-sm font-medium text-destructive">
          {error.message as string}
        </p>
      )}
    </div>
  );
}
