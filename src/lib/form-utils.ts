import { useForm, UseFormReturn, FieldValues, SubmitHandler, UseFormProps, FieldPath, FieldPathValue, Path, PathValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z, ZodType, ZodTypeDef } from 'zod';
import { useEffect, useRef } from 'react';
import { toast } from '@/components/notifications';

export type FormSchema<T extends FieldValues> = ZodType<T, ZodTypeDef, T>;

export interface UseAppFormProps<T extends FieldValues> extends UseFormProps<T> {
  schema: FormSchema<T>;
  defaultValues?: T;
  onSubmit: SubmitHandler<T>;
  onSuccess?: (data: T) => void;
  onError?: (errors: any, e: any) => void;
  successMessage?: string;
  errorMessage?: string;
}

export function useAppForm<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  onSuccess,
  onError,
  successMessage,
  errorMessage = 'Please check the form for errors.',
  ...formProps
}: UseAppFormProps<T>): UseFormReturn<T> & { handleSubmit: () => void } {
  const form = useForm<T>({
    resolver: zodResolver(schema as any),
    defaultValues: defaultValues as any,
    mode: 'onTouched',
    reValidateMode: 'onChange',
    ...formProps,
  });

  const isSubmittingRef = useRef(false);
  const { handleSubmit, formState: { isSubmitting } } = form;

  useEffect(() => {
    isSubmittingRef.current = isSubmitting;
  }, [isSubmitting]);

  const handleFormSubmit = handleSubmit(async (data, e) => {
    if (isSubmittingRef.current) return;
    
    try {
      await onSubmit(data, e);
      
      if (onSuccess) {
        onSuccess(data);
      }
      
      if (successMessage) {
        toast.success({ title: 'Success', description: successMessage });
      }
    } catch (error) {
      console.error('Form submission error:', error);
      
      if (onError) {
        onError(form.formState.errors, error);
      }
      
      toast.error({
        title: 'Error',
        description: errorMessage,
      });
    } finally {
      isSubmittingRef.current = false;
    }
  });

  return {
    ...form,
    handleSubmit: handleFormSubmit,
  };
}

// Helper type for form field props
export type FormFieldProps<TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>> = {
  name: TName;
  label?: string;
  description?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  control: any; // Use the correct type from your form library
  defaultValue?: FieldPathValue<TFieldValues, TName>;
};

// Helper function to safely get nested values
export function getNestedValue<T extends object, K extends string>(
  obj: T,
  path: K
): any {
  return path
    .split('.')
    .reduce((o, p) => (o && o[p] !== undefined ? o[p] : undefined), obj as any);
}

// Helper function to set nested values
export function setNestedValue<T extends object, K extends string>(
  obj: T,
  path: K,
  value: any
): T {
  const keys = path.split('.');
  const newObj = { ...obj };
  let current: any = newObj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (current[key] === undefined) {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
  return newObj;
}

// Helper function to create form field props
export function createFieldProps<T extends FieldValues>(
  form: UseFormReturn<T>,
  name: Path<T>,
  options?: {
    label?: string;
    description?: string;
    required?: boolean;
    disabled?: boolean;
    className?: string;
  }
) {
  const { formState: { errors }, register } = form;
  const error = getNestedValue(errors, name as string)?.message;
  
  return {
    ...register(name),
    id: name,
    label: options?.label,
    description: options?.description,
    error,
    required: options?.required,
    disabled: options?.disabled,
    className: options?.className,
  };
}

// Helper function to handle file uploads
export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Helper function to validate file size and type
export function validateFile(
  file: File,
  options: {
    maxSizeMB?: number;
    acceptedTypes?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSizeMB = 5, acceptedTypes = [] } = options;
  
  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return {
      valid: false,
      error: `File size must be less than ${maxSizeMB}MB`,
    };
  }
  
  // Check file type
  if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type not supported. Allowed types: ${acceptedTypes.join(', ')}`,
    };
  }
  
  return { valid: true };
}

// Helper function to handle form reset after submission
export function useFormReset<T extends FieldValues>(
  form: UseFormReturn<T>,
  defaultValues?: T
) {
  const { reset } = form;
  
  return (values?: T) => {
    reset(values || defaultValues || ({} as T));
  };
}

// Helper function to handle form field arrays
export function useFieldArrayHelpers<T extends FieldValues, K extends Path<T>>(
  form: UseFormReturn<T>,
  name: K
) {
  const { control, watch } = form;
  const fields = watch(name as any) || [];
  
  const append = (value: PathValue<T, K> extends (infer U)[] ? U : never) => {
    const currentFields = fields as any[];
    form.setValue(name, [...currentFields, value] as any, { shouldDirty: true });
  };
  
  const remove = (index: number) => {
    const currentFields = [...(fields as any[])];
    currentFields.splice(index, 1);
    form.setValue(name, currentFields as any, { shouldDirty: true });
  };
  
  const update = (index: number, value: any) => {
    const currentFields = [...(fields as any[])];
    currentFields[index] = value;
    form.setValue(name, currentFields as any, { shouldDirty: true });
  };
  
  const move = (from: number, to: number) => {
    const currentFields = [...(fields as any[])];
    const [moved] = currentFields.splice(from, 1);
    currentFields.splice(to, 0, moved);
    form.setValue(name, currentFields as any, { shouldDirty: true });
  };
  
  return {
    fields,
    append,
    remove,
    update,
    move,
    control,
  };
}
