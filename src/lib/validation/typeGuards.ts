import { z } from 'zod';
import { STORE_NAMES } from '@/lib/schemas_v2';
import { storeSchemas } from './personnel.schemas';

/**
 * Type guard to check if a value matches a specific schema
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns Type predicate indicating if data matches the schema
 */
export function isOfType<T>(
  schema: z.ZodType<T>,
  data: unknown
): data is T {
  return schema.safeParse(data).success;
}

/**
 * Type guard for store entities
 * @param storeName The name of the store (e.g., 'ranks', 'assignments')
 * @param data The data to validate
 * @returns Type predicate indicating if data matches the store's schema
 */
export function isValidStoreEntity<
  T extends keyof typeof storeSchemas
>(
  storeName: T,
  data: unknown
): data is z.infer<typeof storeSchemas[T]> {
  const schema = storeSchemas[storeName];
  return schema.safeParse(data).success;
}

/**
 * Asserts that a value matches a specific schema
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @param errorMessage Optional custom error message
 * @throws Error if validation fails
 */
export function assertValid<T>(
  schema: z.ZodType<T>,
  data: unknown,
  errorMessage = 'Invalid data'
): asserts data is T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const errors = result.error.errors
      .map(err => `${err.path.join('.')}: ${err.message}`)
      .join('\n');
    throw new Error(`${errorMessage}\n${errors}`);
  }
}

/**
 * Safely parses data with a schema, returning a tuple of [data, error]
 * @param schema The Zod schema to parse against
 * @param data The data to parse
 * @returns A tuple containing the parsed data or undefined, and an error if any
 */
export function safeParse<T>(
  schema: z.ZodType<T>,
  data: unknown
): [T | undefined, Error | undefined] {
  const result = schema.safeParse(data);
  if (result.success) {
    return [result.data, undefined];
  }
  return [
    undefined,
    new Error(
      result.error.errors
        .map(err => `${err.path.join('.')}: ${err.message}`)
        .join('\n')
    ),
  ];
}

/**
 * Creates a type guard for a specific schema
 * @param schema The Zod schema to create a type guard for
 * @returns A type guard function
 */
export function createTypeGuard<T>(schema: z.ZodType<T>) {
  return (data: unknown): data is T => isOfType(schema, data);
}

// Pre-built type guards
export const isRank = createTypeGuard(storeSchemas[STORE_NAMES.RANKS]);
export const isAssignment = createTypeGuard(
  storeSchemas[STORE_NAMES.CREW_ASSIGNMENTS]
);
export const isPayroll = createTypeGuard(storeSchemas[STORE_NAMES.PAYROLLS]);
