import { z } from 'zod';
import { idSchema, dateSchema } from './common.schemas';

export const vesselTypeSchema = z.enum([
  'cargo',
  'tanker',
  'fishing',
  'passenger',
  'offshore',
  'naval',
  'yacht',
  'other',
]);

export const vesselStatusSchema = z.enum([
  'active',
  'inactive',
  'maintenance',
  'drydock',
  'scrapped',
]);

export const vesselBaseSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  imoNumber: z.string().regex(/^\d{7}$/, 'IMO number must be 7 digits'),
  mmsiNumber: z.string().regex(/^[0-9]{9}$/, 'MMSI must be 9 digits').optional(),
  callSign: z.string().max(10).optional(),
  flag: z.string().min(2).max(50),
  type: vesselTypeSchema,
  status: vesselStatusSchema.default('active'),
  yearBuilt: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  grossTonnage: z.number().positive().optional(),
  netTonnage: z.number().positive().optional(),
  lengthOverall: z.number().positive().optional(),
  beam: z.number().positive().optional(),
  draft: z.number().positive().optional(),
  owner: z.string().max(100).optional(),
  operator: z.string().max(100).optional(),
  classificationSociety: z.string().max(100).optional(),
  insuranceProvider: z.string().max(100).optional(),
  insurancePolicyNumber: z.string().max(50).optional(),
  insuranceExpiryDate: dateSchema.optional(),
  lastInspectionDate: dateSchema.optional(),
  nextInspectionDate: dateSchema.optional(),
  notes: z.string().max(1000).optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional(),
});

export const createVesselSchema = vesselBaseSchema.omit({ id: true });
export const updateVesselSchema = vesselBaseSchema.partial().extend({
  id: idSchema,
});

export const vesselFilterSchema = z.object({
  search: z.string().optional(),
  status: vesselStatusSchema.optional(),
  type: vesselTypeSchema.optional(),
  flag: z.string().optional(),
  yearBuiltMin: z.number().int().min(1900).optional(),
  yearBuiltMax: z.number().int().max(new Date().getFullYear() + 1).optional(),
});

// Types
export type VesselType = z.infer<typeof vesselTypeSchema>;
export type VesselStatus = z.infer<typeof vesselStatusSchema>;
export type Vessel = z.infer<typeof vesselBaseSchema>;
export type CreateVesselInput = z.infer<typeof createVesselSchema>;
export type UpdateVesselInput = z.infer<typeof updateVesselSchema>;
export type VesselFilter = z.infer<typeof vesselFilterSchema>;
