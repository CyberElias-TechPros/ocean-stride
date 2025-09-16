import { useForm, UseFormReturn, SubmitHandler, UseFormProps } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type UseZodFormProps<T extends z.ZodType> = {
  schema: T;
  defaultValues?: UseFormProps<z.infer<T>>['defaultValues'];
  options?: Omit<UseFormProps<z.infer<T>>, 'resolver' | 'defaultValues'>;
};

export const useZodForm = <T extends z.ZodType>({
  schema,
  defaultValues,
  options = {},
}: UseZodFormProps<T>) => {
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onChange',
    ...options,
  });

  const handleSubmit = (
    onValid: SubmitHandler<z.infer<T>>,
    onInvalid?: (errors: any) => void
  ) => {
    return form.handleSubmit(onValid, onInvalid);
  };

  return {
    ...form,
    handleSubmit,
  } as UseFormReturn<z.infer<T>> & {
    handleSubmit: (
      onValid: SubmitHandler<z.infer<T>>,
      onInvalid?: (errors: any) => void
    ) => (e?: React.BaseSyntheticEvent) => Promise<void>;
  };
};
