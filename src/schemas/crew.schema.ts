import { z } from 'zod';
import { idSchema, dateSchema } from './common.schemas';

export const crewRankSchema = z.enum([
  'captain',
  'chief_officer',
  'second_officer',
  'third_officer',
  'bosun',
  'able_seaman',
  'ordinary_seaman',
  'chief_engineer',
  'second_engineer',
  'third_engineer',
  'fourth_engineer',
  'electrician',
  'oiler',
  'wiper',
  'cook',
  'steward',
  'deck_cadet',
  'engine_cadet',
  'other',
]);

export const crewStatusSchema = z.enum([
  'onboard',
  'on_leave',
  'on_training',
  'in_transit',
  'inactive',
]);

export const documentTypeSchema = z.enum([
  'passport',
  'seaman_book',
  'certificate_of_competency',
  'medical_certificate',
  'visa',
  'other',
]);

export const documentStatusSchema = z.enum([
  'valid',
  'expired',
  'expiring_soon',
  'not_required',
]);

export const documentSchema = z.object({
  id: idSchema.optional(),
  type: documentTypeSchema,
  number: z.string().min(1, 'Document number is required'),
  issueDate: dateSchema.optional(),
  expiryDate: dateSchema.optional(),
  issuedBy: z.string().optional(),
  status: documentStatusSchema.optional(),
  fileUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const crewBaseSchema = z.object({
  id: idSchema.optional(),
  userId: idSchema.optional(),
  firstName: z.string().min(2, 'First name is required').max(50),
  lastName: z.string().min(2, 'Last name is required').max(50),
  dateOfBirth: dateSchema,
  nationality: z.string().min(2, 'Nationality is required'),
  rank: crewRankSchema,
  status: crewStatusSchema.default('inactive'),
  joiningDate: dateSchema.optional(),
  leavingDate: dateSchema.optional(),
  vesselId: idSchema.optional().nullable(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z.string().optional(),
  emergencyContactRelationship: z.string().optional(),
  documents: z.array(documentSchema).default([]),
  medicalRecords: z.array(z.any()).default([]), // This would be expanded with proper medical record schema
  training: z.array(z.any()).default([]), // This would be expanded with proper training schema
  notes: z.string().optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
});

export const createCrewSchema = crewBaseSchema.omit({ id: true });
export const updateCrewSchema = crewBaseSchema.partial().extend({
  id: idSchema,
});

export const crewFilterSchema = z.object({
  search: z.string().optional(),
  status: crewStatusSchema.optional(),
  rank: crewRankSchema.optional(),
  nationality: z.string().optional(),
  vesselId: idSchema.optional(),
  documentExpiringInDays: z.number().int().positive().optional(),
});

// Types
export type CrewRank = z.infer<typeof crewRankSchema>;
export type CrewStatus = z.infer<typeof crewStatusSchema>;
export type DocumentType = z.infer<typeof documentTypeSchema>;
export type DocumentStatus = z.infer<typeof documentStatusSchema>;
export type CrewDocument = z.infer<typeof documentSchema>;
export type Crew = z.infer<typeof crewBaseSchema>;
export type CreateCrewInput = z.infer<typeof createCrewSchema>;
export type UpdateCrewInput = z.infer<typeof updateCrewSchema>;
export type CrewFilter = z.infer<typeof crewFilterSchema>;
