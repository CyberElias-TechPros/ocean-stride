import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Check, ChevronDown } from 'lucide-react';
import * as SelectPrimitive from '@radix-ui/react-select';

type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type FormSelectProps = {
  name: string;
  label?: string;
  description?: string;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  selectClassName?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  required?: boolean;
  disabled?: boolean;
  onValueChange?: (value: string) => void;
};

export function FormSelect({
  name,
  label,
  description,
  placeholder = 'Select an option',
  options,
  className,
  selectClassName,
  labelClassName,
  descriptionClassName,
  required = false,
  disabled = false,
  onValueChange,
}: FormSelectProps) {
  const { register, setValue, formState: { errors } } = useFormContext();
  const error = errors[name];
  
  const handleValueChange = (value: string) => {
    setValue(name, value, { shouldValidate: true });
    onValueChange?.(value);
  };
  
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
      
      <input type="hidden" {...register(name)} />
      
      <SelectPrimitive.Root onValueChange={handleValueChange} disabled={disabled}>
        <SelectPrimitive.Trigger
          id={name}
          className={cn(
            'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:ring-destructive/50',
            selectClassName
          )}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="h-4 w-4 opacity-50">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            className="relative z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2"
          >
            <SelectPrimitive.Viewport className="p-1">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className={cn(
                    'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                    option.disabled && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <SelectPrimitive.ItemIndicator>
                      <Check className="h-4 w-4" />
                    </SelectPrimitive.ItemIndicator>
                  </span>
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      
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
