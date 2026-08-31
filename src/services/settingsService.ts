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
    name: 'Ocean Stride',
    email: 'ops@oceanstride.com',
    phone: '',
    address: ''
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
        userManagement: true,
      },
    },
    {
      name: 'manager',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: true,
        deleteSeafarerRecords: false,
        processPayroll: true,
        systemConfiguration: false,
        userManagement: false,
      },
    },
    {
      name: 'seafarer',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: false,
        deleteSeafarerRecords: false,
        processPayroll: false,
        systemConfiguration: false,
        userManagement: false,
      },
    },
    {
      name: 'captain',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: true,
        deleteSeafarerRecords: false,
        processPayroll: false,
        systemConfiguration: false,
        userManagement: false,
      },
    },
    {
      name: 'officer',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: false,
        deleteSeafarerRecords: false,
        processPayroll: false,
        systemConfiguration: false,
        userManagement: false,
      },
    },
    {
      name: 'crew',
      permissions: {
        viewSeafarerProfiles: true,
        editSeafarerProfiles: false,
        deleteSeafarerRecords: false,
        processPayroll: false,
        systemConfiguration: false,
        userManagement: false,
      },
    },
  ],
  notifications: [],
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
  apiKeys: [],
});

const getDefaultIntegrationSettings = (): IntegrationSettings => ({
  integrations: [],
});

const getDefaultBackupSettings = (): BackupSettings => ({
  automatic: {
    enabled: true,
    frequency: 'daily',
    retention: 30
  },
  manual: {
    backups: [],
  },
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