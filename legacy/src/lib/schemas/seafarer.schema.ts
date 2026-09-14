import { z } from 'zod';

export const seafarerPersonalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(6, 'Phone number must be at least 6 characters'),
  nationality: z.string().min(2, 'Nationality is required'),
  dateOfBirth: z.string().or(z.date()),
  placeOfBirth: z.string().optional(),
  maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed']).default('single'),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  contact: z.object({
    email: z.string().email('Invalid email address'),
    phone: z.string().min(6, 'Phone number is required'),
    emergencyContact: z.object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().email('Invalid email').optional().or(z.literal('')),
    }).optional(),
  }),
  photoUrl: z.string().optional(),
});

export const seafarerEmploymentSchema = z.object({
  rankId: z.string().min(1, 'Rank is required'),
  rank: z.string().optional(),
  department: z.enum(['deck', 'engine', 'catering', 'other']).default('deck'),
  status: z.enum(['onboard', 'on_leave', 'on_training', 'inactive']).default('on_leave'),
  currentVesselId: z.string().optional(),
  currentVesselName: z.string().optional(),
  signOnDate: z.string().or(z.date()).optional(),
  contractEndDate: z.string().or(z.date()).optional(),
  baseWage: z.number().min(0, 'Base wage must be a positive number').default(0),
  wageCurrency: z.string().default('USD'),
  workHoursPerWeek: z.number().min(0).max(168).default(48),
  leaveDaysPerYear: z.number().min(0).default(30),
  employmentType: z.enum(['permanent', 'contract', 'temporary']).default('permanent'),
  employmentStatus: z.enum(['active', 'inactive', 'suspended', 'retired']).default('active'),
  joinedDate: z.string().or(z.date()).default(() => new Date().toISOString()),
  notes: z.string().optional(),
});

export const seafarerDocumentSchema = z.object({
  id: z.string().optional(),
  type: z.string().min(1, 'Document type is required'),
  number: z.string().min(1, 'Document number is required'),
  issueDate: z.string().or(z.date()),
  expiryDate: z.string().or(z.date()),
  issuedBy: z.string().optional(),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
});

export const seafarerFormSchema = z.object({
  personalInfo: seafarerPersonalInfoSchema,
  employment: seafarerEmploymentSchema,
  documents: z.array(seafarerDocumentSchema).default([]),
  trainings: z.array(z.any()).default([]), // Will be defined in training schema
  medicals: z.array(z.any()).default([]),  // Will be defined in medical schema
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({
    language: z.string(),
    proficiency: z.enum(['basic', 'intermediate', 'fluent', 'native']),
  })).default([]),
  notes: z.string().optional(),
});

export type SeafarerFormValues = z.infer<typeof seafarerFormSchema>;
