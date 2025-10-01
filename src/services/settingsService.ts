import { db } from '@/lib/database2';
import {
  SystemSettings,
  GeneralSettings,
  UserManagementSettings,
  SecuritySettings,
  IntegrationSettings,
  BackupSettings
} from '@/lib/schemas';
import {
  generalSettingsSchema,
  userManagementSettingsSchema,
  securitySettingsSchema,
  integrationSettingsSchema,
  backupSettingsSchema,
  systemSettingsSchema
} from '@/lib/validation/settings.schemas';

// Default settings values
const getDefaultGeneralSettings = (): GeneralSettings => ({
  companyInfo: {
    name: 'SeaManager Maritime Solutions',
    email: 'contact@seamanager.com',
    phone: '+1-555-0123',
    address: '123 Harbor Street, Maritime City, MC 12345'
  },
  regional: {
    timezone: 'utc',
    currency: 'usd',
    language: 'en',
    dateFormat: 'mm-dd-yyyy'
  },
  appearance: {
    theme: 'light',
    compactMode: false
  },
  dataManagement: {
    retentionPeriod: '7-years',
    autoCleanup: true,
    auditLogging: true
  }
});

const getDefaultUserManagementSettings = (): UserManagementSettings => ({
  roles: [
    {
      name: 'admin',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: true,
        deleteSeafarerRecords: true,
        processPayroll: true,
        systemConfiguration: true,
        userManagement: true
      }
    },
    {
      name: 'manager',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: true,
        deleteSeafarerRecords: false,
        processPayroll: true,
        systemConfiguration: false,
        userManagement: false
      }
    },
    {
      name: 'viewer',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: false,
        deleteSeafarerRecords: false,
        processPayroll: false,
        systemConfiguration: false,
        userManagement: false
      }
    }
  ],
  notifications: [
    {
      id: '1',
      name: 'Certificate Expiry',
      description: 'Alerts when certificates are expiring within 60 days',
      email: true,
      sms: true,
      push: true
    },
    {
      id: '2',
      name: 'Contract Endings',
      description: 'Notifications for upcoming contract endings',
      email: true,
      sms: false,
      push: true
    },
    {
      id: '3',
      name: 'Compliance Violations',
      description: 'Immediate alerts for any compliance violations',
      email: true,
      sms: true,
      push: true
    },
    {
      id: '4',
      name: 'Payroll Processing',
      description: 'Updates on payroll processing status',
      email: true,
      sms: false,
      push: false
    },
    {
      id: '5',
      name: 'System Maintenance',
      description: 'Scheduled maintenance and downtime notifications',
      email: true,
      sms: false,
      push: true
    }
  ]
});

const getDefaultSecuritySettings = (): SecuritySettings => ({
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSymbols: false
  },
  sessionManagement: {
    timeout: 60,
    forceLogoutOnClose: false,
    allowConcurrentSessions: true
  },
  twoFactorAuth: {
    requireForAdmins: true,
    allowForAllUsers: true
  },
  apiKeys: [
    {
      id: '1',
      name: 'Mobile App API',
      key: 'sk_live_••••••••••••1234',
      created: '2024-01-15',
      status: 'active'
    },
    {
      id: '2',
      name: 'Third-party Integration',
      key: 'sk_live_••••••••••••5678',
      created: '2024-01-10',
      status: 'active'
    },
    {
      id: '3',
      name: 'Webhook Endpoint',
      key: 'sk_live_••••••••••••9012',
      created: '2024-01-05',
      status: 'inactive'
    }
  ]
});

const getDefaultIntegrationSettings = (): IntegrationSettings => ({
  integrations: [
    {
      name: 'Accounting System',
      description: 'Sync payroll data with QuickBooks',
      status: 'connected',
      lastSync: '2024-01-20 14:30',
      config: {}
    },
    {
      name: 'Email Service',
      description: 'SendGrid for notification delivery',
      status: 'connected',
      lastSync: '2024-01-20 15:45',
      config: {}
    },
    {
      name: 'SMS Provider',
      description: 'Twilio for SMS notifications',
      status: 'disconnected',
      config: {}
    },
    {
      name: 'Document Storage',
      description: 'AWS S3 for certificate storage',
      status: 'connected',
      lastSync: '2024-01-20 16:15',
      config: {}
    },
    {
      name: 'Maritime Database',
      description: 'IMO vessel information lookup',
      status: 'connected',
      lastSync: '2024-01-20 12:00',
      config: {}
    },
    {
      name: 'Training Provider',
      description: 'Online training platform API',
      status: 'disconnected',
      config: {}
    }
  ]
});

const getDefaultBackupSettings = (): BackupSettings => ({
  automatic: {
    enabled: true,
    frequency: 'daily',
    retention: 30
  },
  manual: {
    backups: [
      { date: '2024-01-20 02:00', size: '2.4 GB', status: 'completed' },
      { date: '2024-01-19 02:00', size: '2.3 GB', status: 'completed' },
      { date: '2024-01-18 02:00', size: '2.3 GB', status: 'completed' },
      { date: '2024-01-17 02:00', size: '2.2 GB', status: 'failed' },
      { date: '2024-01-16 02:00', size: '2.2 GB', status: 'completed' }
    ]
  }
});

const getDefaultSettings = (companyId: string): Omit<SystemSettings, 'id' | 'createdAt' | 'updatedAt'> => ({
  companyId,
  general: getDefaultGeneralSettings(),
  userManagement: getDefaultUserManagementSettings(),
  security: getDefaultSecuritySettings(),
  integrations: getDefaultIntegrationSettings(),
  backup: getDefaultBackupSettings()
});

export class SettingsService {
  async getSettings(companyId: string): Promise<SystemSettings> {
    try {
      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        // Create default settings if none exist
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      // Validate the loaded settings
      systemSettingsSchema.parse(settings);

      return settings;
    } catch (error) {
      console.error('Failed to get settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to load settings');
    }
  }

  async updateGeneralSettings(companyId: string, updates: Partial<GeneralSettings>): Promise<SystemSettings> {
    try {
      // Validate the updates
      const validatedUpdates = generalSettingsSchema.partial().parse(updates);

      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedGeneral = { ...settings.general, ...validatedUpdates };
      // Validate the complete general settings
      generalSettingsSchema.parse(updatedGeneral);

      const updatedSettings = await db.updateSystemSettings(settings.id, {
        general: updatedGeneral
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update general settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update general settings');
    }
  }

  async updateUserManagementSettings(companyId: string, updates: Partial<UserManagementSettings>): Promise<SystemSettings> {
    try {
      // Validate the updates
      const validatedUpdates = userManagementSettingsSchema.partial().parse(updates);

      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedUserManagement = { ...settings.userManagement, ...validatedUpdates };
      // Validate the complete user management settings
      userManagementSettingsSchema.parse(updatedUserManagement);

      const updatedSettings = await db.updateSystemSettings(settings.id, {
        userManagement: updatedUserManagement
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update user management settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update user management settings');
    }
  }

  async updateSecuritySettings(companyId: string, updates: Partial<SecuritySettings>): Promise<SystemSettings> {
    try {
      // Validate the updates
      const validatedUpdates = securitySettingsSchema.partial().parse(updates);

      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedSecurity = { ...settings.security, ...validatedUpdates };
      // Validate the complete security settings
      securitySettingsSchema.parse(updatedSecurity);

      const updatedSettings = await db.updateSystemSettings(settings.id, {
        security: updatedSecurity
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update security settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update security settings');
    }
  }

  async updateIntegrationSettings(companyId: string, updates: Partial<IntegrationSettings>): Promise<SystemSettings> {
    try {
      // Validate the updates
      const validatedUpdates = integrationSettingsSchema.partial().parse(updates);

      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedIntegrations = { ...settings.integrations, ...validatedUpdates };
      // Validate the complete integration settings
      integrationSettingsSchema.parse(updatedIntegrations);

      const updatedSettings = await db.updateSystemSettings(settings.id, {
        integrations: updatedIntegrations
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update integration settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update integration settings');
    }
  }

  async updateBackupSettings(companyId: string, updates: Partial<BackupSettings>): Promise<SystemSettings> {
    try {
      // Validate the updates
      const validatedUpdates = backupSettingsSchema.partial().parse(updates);

      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedBackup = { ...settings.backup, ...validatedUpdates };
      // Validate the complete backup settings
      backupSettingsSchema.parse(updatedBackup);

      const updatedSettings = await db.updateSystemSettings(settings.id, {
        backup: updatedBackup
      });

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update backup settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update backup settings');
    }
  }

  async updateAllSettings(companyId: string, updates: {
    general?: Partial<GeneralSettings>;
    userManagement?: Partial<UserManagementSettings>;
    security?: Partial<SecuritySettings>;
    integrations?: Partial<IntegrationSettings>;
    backup?: Partial<BackupSettings>;
  }): Promise<SystemSettings> {
    try {
      await db.init();
      let settings = await db.getSystemSettings(companyId);

      if (!settings) {
        settings = await db.createSystemSettings(getDefaultSettings(companyId));
      }

      const updatedData: any = {};

      if (updates.general) {
        const validatedGeneral = generalSettingsSchema.partial().parse(updates.general);
        updatedData.general = { ...settings.general, ...validatedGeneral };
      }
      if (updates.userManagement) {
        const validatedUserManagement = userManagementSettingsSchema.partial().parse(updates.userManagement);
        updatedData.userManagement = { ...settings.userManagement, ...validatedUserManagement };
      }
      if (updates.security) {
        const validatedSecurity = securitySettingsSchema.partial().parse(updates.security);
        updatedData.security = { ...settings.security, ...validatedSecurity };
      }
      if (updates.integrations) {
        const validatedIntegrations = integrationSettingsSchema.partial().parse(updates.integrations);
        updatedData.integrations = { ...settings.integrations, ...validatedIntegrations };
      }
      if (updates.backup) {
        const validatedBackup = backupSettingsSchema.partial().parse(updates.backup);
        updatedData.backup = { ...settings.backup, ...validatedBackup };
      }

      const updatedSettings = await db.updateSystemSettings(settings.id, updatedData);

      // Validate the complete updated settings
      systemSettingsSchema.parse(updatedSettings);

      return updatedSettings;
    } catch (error) {
      console.error('Failed to update settings:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to update settings');
    }
  }

  async resetToDefaults(companyId: string): Promise<SystemSettings> {
    try {
      await db.init();
      const settings = await db.getSystemSettings(companyId);

      if (settings) {
        await db.deleteSystemSettings(settings.id);
      }

      return await db.createSystemSettings(getDefaultSettings(companyId));
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw new Error('Failed to reset settings to defaults');
    }
  }
}

export const settingsService = new SettingsService();