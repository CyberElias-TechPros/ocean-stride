import { z } from 'zod';

// General Settings Schemas
export const companyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
});

export const regionalSettingsSchema = z.object({
  timezone: z.string().min(1, 'Timezone is required'),
  currency: z.string().length(3, 'Currency must be a 3-letter code'),
  language: z.string().min(1, 'Language is required'),
  dateFormat: z.enum(['mm-dd-yyyy', 'dd-mm-yyyy', 'yyyy-mm-dd'], {
    errorMap: () => ({ message: 'Invalid date format' }),
  }),
});

export const appearanceSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto'], {
    errorMap: () => ({ message: 'Invalid theme selection' }),
  }),
  logoUrl: z.string().url().optional().or(z.literal('')),
  compactMode: z.boolean(),
});

export const dataManagementSettingsSchema = z.object({
  retentionPeriod: z.enum(['5-years', '7-years', '10-years', 'indefinite'], {
    errorMap: () => ({ message: 'Invalid retention period' }),
  }),
  autoCleanup: z.boolean(),
  auditLogging: z.boolean(),
});

export const generalSettingsSchema = z.object({
  companyInfo: companyInfoSchema,
  regional: regionalSettingsSchema,
  appearance: appearanceSettingsSchema,
  dataManagement: dataManagementSettingsSchema,
});

// User Management Settings Schemas
export const rolePermissionSchema = z.object({
  name: z.string().min(1, 'Role name is required'),
  permissions: z.record(z.boolean()),
});

export const notificationSettingSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  email: z.boolean(),
  sms: z.boolean(),
  push: z.boolean(),
});

export const userManagementSettingsSchema = z.object({
  roles: z.array(rolePermissionSchema),
  notifications: z.array(notificationSettingSchema),
});

// Security Settings Schemas
export const passwordPolicySchema = z.object({
  minLength: z.number().int().min(6).max(128),
  requireUppercase: z.boolean(),
  requireNumbers: z.boolean(),
  requireSymbols: z.boolean(),
});

export const sessionManagementSchema = z.object({
  timeout: z.number().int().min(5).max(480), // 5 minutes to 8 hours
  forceLogoutOnClose: z.boolean(),
  allowConcurrentSessions: z.boolean(),
});

export const twoFactorAuthSchema = z.object({
  requireForAdmins: z.boolean(),
  allowForAllUsers: z.boolean(),
});

export const apiKeySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'API key name is required'),
  key: z.string(),
  created: z.string(),
  status: z.enum(['active', 'inactive']),
});

export const securitySettingsSchema = z.object({
  passwordPolicy: passwordPolicySchema,
  sessionManagement: sessionManagementSchema,
  twoFactorAuth: twoFactorAuthSchema,
  apiKeys: z.array(apiKeySchema),
});

// Integration Settings Schemas
export const integrationSchema = z.object({
  name: z.string(),
  description: z.string(),
  status: z.enum(['connected', 'disconnected']),
  lastSync: z.string().optional(),
  config: z.record(z.any()).optional(),
});

export const integrationSettingsSchema = z.object({
  integrations: z.array(integrationSchema),
});

// Backup Settings Schemas
export const automaticBackupSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  retention: z.number().int().min(1).max(365), // 1 day to 1 year
});

export const manualBackupSchema = z.object({
  lastBackup: z.string().optional(),
  backups: z.array(z.object({
    date: z.string(),
    size: z.string(),
    status: z.enum(['completed', 'failed']),
  })),
});

export const backupSettingsSchema = z.object({
  automatic: automaticBackupSchema,
  manual: manualBackupSchema,
});

// Complete System Settings Schema
export const systemSettingsSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  general: generalSettingsSchema,
  userManagement: userManagementSettingsSchema,
  security: securitySettingsSchema,
  integrations: integrationSettingsSchema,
  backup: backupSettingsSchema,
});

// Form-specific schemas for validation
export const generalSettingsFormSchema = generalSettingsSchema;
export const userManagementSettingsFormSchema = userManagementSettingsSchema;
export const securitySettingsFormSchema = securitySettingsSchema;
export const integrationSettingsFormSchema = integrationSettingsSchema;
export const backupSettingsFormSchema = backupSettingsSchema;

// Type exports
export type CompanyInfo = z.infer<typeof companyInfoSchema>;
export type RegionalSettings = z.infer<typeof regionalSettingsSchema>;
export type AppearanceSettings = z.infer<typeof appearanceSettingsSchema>;
export type DataManagementSettings = z.infer<typeof dataManagementSettingsSchema>;
export type GeneralSettings = z.infer<typeof generalSettingsSchema>;

export type RolePermission = z.infer<typeof rolePermissionSchema>;
export type NotificationSetting = z.infer<typeof notificationSettingSchema>;
export type UserManagementSettings = z.infer<typeof userManagementSettingsSchema>;

export type PasswordPolicy = z.infer<typeof passwordPolicySchema>;
export type SessionManagement = z.infer<typeof sessionManagementSchema>;
export type TwoFactorAuth = z.infer<typeof twoFactorAuthSchema>;
export type ApiKey = z.infer<typeof apiKeySchema>;
export type SecuritySettings = z.infer<typeof securitySettingsSchema>;

export type Integration = z.infer<typeof integrationSchema>;
export type IntegrationSettings = z.infer<typeof integrationSettingsSchema>;

export type AutomaticBackup = z.infer<typeof automaticBackupSchema>;
export type ManualBackup = z.infer<typeof manualBackupSchema>;
export type BackupSettings = z.infer<typeof backupSettingsSchema>;

export type SystemSettings = z.infer<typeof systemSettingsSchema>;