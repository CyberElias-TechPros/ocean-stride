import * as React from 'react';
import { 
  useForm, 
  FormProvider, 
  UseFormProps, 
  SubmitHandler, 
  useFormContext as useHookFormContext 
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';

type FormProps<T extends z.ZodType> = {
  schema: T;
  onSubmit: SubmitHandler<z.infer<T>>;
  className?: string;
  defaultValues?: UseFormProps<z.infer<T>>['defaultValues'];
  children: React.ReactNode;
  id?: string;
};

export function Form<T extends z.ZodType>({
  schema,
  onSubmit,
  className,
  defaultValues,
  children,
  id,
}: FormProps<T>) {
  const methods = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
  });

  return (
    <FormProvider {...methods}>
      <form
        id={id}
        onSubmit={methods.handleSubmit(onSubmit)}
        className={cn('space-y-6', className)}
      >
        {children}
      </form>
    </FormProvider>
  );
}

type FormFieldContextValue = {
  name: string;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue
);

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const { getFieldState, formState } = useHookFormContext();
  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  return {
    ...fieldContext,
    ...fieldState,
  };
};

type FormFieldProps = {
  name: string;
  children: React.ReactNode;
  className?: string;
};

export function FormField({ name, children, className }: FormFieldProps) {
  return (
    <FormFieldContext.Provider value={{ name }}>
      <div className={cn('space-y-2', className)}>{children}</div>
    </FormFieldContext.Provider>
  );
}

type FormItemProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormItem({ children, className }: FormItemProps) {
  return <div className={cn('space-y-1', className)}>{children}</div>;
}

type FormLabelProps = {
  children: React.ReactNode;
  className?: string;
  required?: boolean;
} & React.LabelHTMLAttributes<HTMLLabelElement>;

export function FormLabel({ children, className, required, ...props }: FormLabelProps) {
  const { error } = useFormField();
  
  return (
    <label
      className={cn(
        'block text-sm font-medium leading-none',
        error && 'text-destructive',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );
}

type FormControlProps = {
  children: React.ReactElement;
};

export function FormControl({ children }: FormControlProps) {
  const { error } = useFormField();
  
  return React.cloneElement(children, {
    className: cn(
      children.props.className,
      error && 'border-destructive focus-visible:ring-destructive/50',
    ),
  });
}

type FormDescriptionProps = {
  children: React.ReactNode;
  className?: string;
};

export function FormDescription({ children, className }: FormDescriptionProps) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </p>
  );
}

type FormMessageProps = {
  children?: React.ReactNode;
  className?: string;
};

export function FormMessage({ children, className }: FormMessageProps) {
  const { error } = useFormField();
  const body = error ? String(error.message) : children;

  if (!body) {
    return null;
  }

  return (
    <p className={cn('text-sm font-medium text-destructive', className)}>
      {body}
    </p>
  );
}

// Export useFormContext with proper typing
export const useFormContext = useHookFormContext;
