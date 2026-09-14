import { z } from 'zod';
import { TypeOf } from 'zod';

type FieldErrors<T> = {
  [K in keyof T]?: string;
};

type FormattedErrors<T> = {
  [K in keyof T]?: {
    message: string;
    type: string;
  };
};

export const formatZodError = <T extends z.ZodType>(
  error: z.ZodError
): FieldErrors<TypeOf<T>> => {
  const fieldErrors: FieldErrors<TypeOf<T>> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      fieldErrors[path as keyof TypeOf<T>] = err.message;
    }
  });
  
  return fieldErrors;
};

export const formatZodErrorForForm = <T extends z.ZodType>(
  error: z.ZodError
): FormattedErrors<TypeOf<T>> => {
  const formattedErrors: FormattedErrors<TypeOf<T>> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (path) {
      formattedErrors[path as keyof TypeOf<T>] = {
        message: err.message,
        type: err.code,
      };
    }
  });
  
  return formattedErrors;
};

export const validateWithZod = <T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: boolean; errors?: FieldErrors<TypeOf<T>> } => {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    return {
      success: false,
      errors: formatZodError<T>(result.error),
    };
  }
  
  return { success: true };
};

// Helper function to create form validation resolver for React Hook Form
export const createZodResolver = <T extends z.ZodType>(
  schema: T
) => {
  return (values: unknown) => {
    const result = schema.safeParse(values);
    
    if (!result.success) {
      return {
        values: {},
        errors: formatZodErrorForForm<T>(result.error),
      };
    }
    
    return {
      values: result.data,
      errors: {},
    };
  };
};
