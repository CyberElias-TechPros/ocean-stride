import { useState, useEffect } from 'react';
import { SystemSettings } from '@/lib/schemas';
import { settingsService } from '@/services/settingsService';
import { useToast } from '@/hooks/use-toast';

export const useSettings = (companyId: string) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsService.getSettings(companyId);
      setSettings(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load settings');
      setError(error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load settings',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGeneralSettings = async (updates: Partial<SystemSettings['general']>) => {
    try {
      const updatedSettings = await settingsService.updateGeneralSettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'General settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update general settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateUserManagementSettings = async (updates: Partial<SystemSettings['userManagement']>) => {
    try {
      const updatedSettings = await settingsService.updateUserManagementSettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'User management settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update user management settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateSecuritySettings = async (updates: Partial<SystemSettings['security']>) => {
    try {
      const updatedSettings = await settingsService.updateSecuritySettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'Security settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update security settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateIntegrationSettings = async (updates: Partial<SystemSettings['integrations']>) => {
    try {
      const updatedSettings = await settingsService.updateIntegrationSettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'Integration settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update integration settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateBackupSettings = async (updates: Partial<SystemSettings['backup']>) => {
    try {
      const updatedSettings = await settingsService.updateBackupSettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'Backup settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update backup settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const updateAllSettings = async (updates: {
    general?: Partial<SystemSettings['general']>;
    userManagement?: Partial<SystemSettings['userManagement']>;
    security?: Partial<SystemSettings['security']>;
    integrations?: Partial<SystemSettings['integrations']>;
    backup?: Partial<SystemSettings['backup']>;
  }) => {
    try {
      const updatedSettings = await settingsService.updateAllSettings(companyId, updates);
      setSettings(updatedSettings);
      toast({
        title: 'Success',
        description: 'All settings updated successfully',
      });
      return updatedSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  const resetToDefaults = async () => {
    try {
      const defaultSettings = await settingsService.resetToDefaults(companyId);
      setSettings(defaultSettings);
      toast({
        title: 'Success',
        description: 'Settings reset to defaults successfully',
      });
      return defaultSettings;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to reset settings');
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    if (companyId) {
      loadSettings();
    }
  }, [companyId]);

  return {
    settings,
    loading,
    error,
    loadSettings,
    updateGeneralSettings,
    updateUserManagementSettings,
    updateSecuritySettings,
    updateIntegrationSettings,
    updateBackupSettings,
    updateAllSettings,
    resetToDefaults
  };
};