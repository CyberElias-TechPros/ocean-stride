import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useEffect } from 'react';
import { RankManagement } from '@/components/settings/RankManagement';
import { useSettings } from '@/hooks/useSettings';
import { useCurrentCompany } from '@/context/CompanyContext';
import {
  Settings as SettingsIcon,
  Users,
  Bell,
  Shield,
  Database,
  Mail,
  Globe,
  Palette,
  Download,
  Upload,
  Trash2,
  Plus,
  Edit,
  Save,
  Key,
  AlertTriangle
} from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  status: 'active' | 'inactive';
  lastLogin: string;
}

interface NotificationSetting {
  id: string;
  name: string;
  description: string;
  email: boolean;
  sms: boolean;
  push: boolean;
}

// Function to create initial system users if none exist
const createInitialUsers = (): User[] => [
  {
    id: 'admin-1',
    name: 'System Administrator',
    email: 'admin@maritime.com',
    role: 'admin',
    status: 'active',
    lastLogin: new Date().toISOString().split('T')[0]
  },
  {
    id: 'manager-1',
    name: 'Fleet Manager',
    email: 'manager@maritime.com',
    role: 'manager',
    status: 'active',
    lastLogin: new Date().toISOString().split('T')[0]
  },
];

const notificationSettings: NotificationSetting[] = [
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
];

export default function Settings() {
  const company = useCurrentCompany();
  const companyId = company?.id || 'default-company'; // Fallback for demo

  const {
    settings,
    loading: settingsLoading,
    error: settingsError,
    updateGeneralSettings,
    updateUserManagementSettings,
    updateSecuritySettings,
    updateIntegrationSettings,
    updateBackupSettings,
    updateAllSettings
  } = useSettings(companyId);

  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load users from localStorage on component mount
  useEffect(() => {
    const loadUsers = () => {
      try {
        const storedUsers = localStorage.getItem('settings_users');
        if (storedUsers) {
          setUsers(JSON.parse(storedUsers));
        } else {
          // Initialize with default users if none exist
          const initialUsers = createInitialUsers();
          setUsers(initialUsers);
          localStorage.setItem('settings_users', JSON.stringify(initialUsers));
        }
      } catch (error) {
        console.error('Failed to load users:', error);
        const initialUsers = createInitialUsers();
        setUsers(initialUsers);
        localStorage.setItem('settings_users', JSON.stringify(initialUsers));
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  // Save users to localStorage whenever users change
  useEffect(() => {
    if (users.length > 0) {
      localStorage.setItem('settings_users', JSON.stringify(users));
    }
  }, [users]);

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: 'destructive',
      manager: 'default',
      viewer: 'secondary'
    } as const;

    const colors = {
      admin: 'bg-destructive/20 text-destructive-foreground',
      manager: 'bg-primary/20 text-primary-foreground',
      viewer: 'bg-muted text-muted-foreground'
    };

    return (
      <Badge variant={variants[role as keyof typeof variants]} className={colors[role as keyof typeof colors]}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    return (
      <Badge variant={status === 'active' ? 'default' : 'secondary'} 
             className={status === 'active' ? 'bg-success/20 text-success-foreground' : ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const updateNotification = (id: string, field: 'email' | 'sms' | 'push', value: boolean) => {
    if (!settings) return;
    const updatedNotifications = settings.userManagement.notifications.map(notification =>
      notification.id === id ? { ...notification, [field]: value } : notification
    );
    updateUserManagementSettings({ notifications: updatedNotifications });
  };

  // Save handlers for different settings categories
  const handleSaveGeneral = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Get form values - in a real implementation, these would come from controlled inputs
      const formData = new FormData(document.querySelector('form') as HTMLFormElement);
      const updates = {
        companyInfo: {
          name: formData.get('company-name') as string || settings.general.companyInfo.name,
          email: formData.get('company-email') as string || settings.general.companyInfo.email,
          phone: formData.get('company-phone') as string || settings.general.companyInfo.phone,
          address: (document.querySelector('#company-address') as HTMLTextAreaElement)?.value || settings.general.companyInfo.address,
        },
        regional: {
          timezone: formData.get('timezone') as string || settings.general.regional.timezone,
          currency: formData.get('currency') as string || settings.general.regional.currency,
          language: formData.get('language') as string || settings.general.regional.language,
          dateFormat: formData.get('date-format') as string || settings.general.regional.dateFormat,
        },
        appearance: {
          theme: (formData.get('theme') as 'light' | 'dark' | 'auto') || settings.general.appearance.theme,
          compactMode: (document.querySelector('#compact-mode') as HTMLInputElement)?.checked || settings.general.appearance.compactMode,
        },
        dataManagement: {
          retentionPeriod: formData.get('retention-period') as string || settings.general.dataManagement.retentionPeriod,
          autoCleanup: (document.querySelector('#auto-cleanup') as HTMLInputElement)?.checked || settings.general.dataManagement.autoCleanup,
          auditLogging: (document.querySelector('#audit-logging') as HTMLInputElement)?.checked || settings.general.dataManagement.auditLogging,
        }
      };
      await updateGeneralSettings(updates);
    } catch (error) {
      console.error('Failed to save general settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveUserManagement = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // User management settings are handled by the updateNotification function
      // No additional save needed here as changes are saved immediately
    } catch (error) {
      console.error('Failed to save user management settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSecurity = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Get form values from security tab
      const formData = new FormData(document.querySelector('form') as HTMLFormElement);
      const updates = {
        passwordPolicy: {
          minLength: parseInt(formData.get('min-length') as string) || settings.security.passwordPolicy.minLength,
          requireUppercase: (document.querySelector('#require-uppercase') as HTMLInputElement)?.checked || settings.security.passwordPolicy.requireUppercase,
          requireNumbers: (document.querySelector('#require-numbers') as HTMLInputElement)?.checked || settings.security.passwordPolicy.requireNumbers,
          requireSymbols: (document.querySelector('#require-symbols') as HTMLInputElement)?.checked || settings.security.passwordPolicy.requireSymbols,
        },
        sessionManagement: {
          timeout: parseInt(formData.get('session-timeout') as string) || settings.security.sessionManagement.timeout,
          forceLogoutOnClose: (document.querySelector('#force-logout') as HTMLInputElement)?.checked || settings.security.sessionManagement.forceLogoutOnClose,
          allowConcurrentSessions: (document.querySelector('#concurrent-sessions') as HTMLInputElement)?.checked || settings.security.sessionManagement.allowConcurrentSessions,
        },
        twoFactorAuth: {
          requireForAdmins: (document.querySelector('#require-2fa') as HTMLInputElement)?.checked || settings.security.twoFactorAuth.requireForAdmins,
          allowForAllUsers: (document.querySelector('#optional-2fa') as HTMLInputElement)?.checked || settings.security.twoFactorAuth.allowForAllUsers,
        }
      };
      await updateSecuritySettings(updates);
    } catch (error) {
      console.error('Failed to save security settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveIntegrations = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      // Integrations are mostly static for now
      await updateIntegrationSettings({});
    } catch (error) {
      console.error('Failed to save integration settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBackup = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const formData = new FormData(document.querySelector('form') as HTMLFormElement);
      const updates = {
        automatic: {
          enabled: (document.querySelector('#auto-backup') as HTMLInputElement)?.checked || settings.backup.automatic.enabled,
          frequency: (formData.get('backup-frequency') as 'hourly' | 'daily' | 'weekly' | 'monthly') || settings.backup.automatic.frequency,
          retention: parseInt(formData.get('backup-retention') as string) || settings.backup.automatic.retention,
        }
      };
      await updateBackupSettings(updates);
    } catch (error) {
      console.error('Failed to save backup settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // This would collect all form data and save everything at once
      // For now, just call individual save handlers
      await handleSaveGeneral();
      await handleSaveUserManagement();
      await handleSaveSecurity();
      await handleSaveIntegrations();
      await handleSaveBackup();
    } catch (error) {
      console.error('Failed to save all settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground">Configure system preferences and user management</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground">Configure system preferences and user management</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-500">Failed to load settings. Please try again.</p>
            <Button onClick={() => window.location.reload()} className="mt-4">
              Reload Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground">Configure system preferences and user management</p>
          </div>

          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Settings
            </Button>
            <Button
              className="ocean-gradient"
              onClick={handleSaveAll}
              disabled={saving || settingsLoading}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="ranks">Ranks</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="backup">Backup</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <SettingsIcon className="w-5 h-5" />
                    Company Information
                  </CardTitle>
                  <CardDescription>Basic company details and branding</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input
                      id="company-name"
                      name="company-name"
                      defaultValue={settings?.general.companyInfo.name || "SeaManager Maritime Solutions"}
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-email">Contact Email</Label>
                    <Input
                      id="company-email"
                      name="company-email"
                      type="email"
                      defaultValue={settings?.general.companyInfo.email || "contact@seamanager.com"}
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Phone Number</Label>
                    <Input
                      id="company-phone"
                      name="company-phone"
                      defaultValue={settings?.general.companyInfo.phone || "+1-555-0123"}
                      disabled={settingsLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="company-address">Address</Label>
                    <Textarea
                      id="company-address"
                      defaultValue={settings?.general.companyInfo.address || "123 Harbor Street, Maritime City, MC 12345"}
                      disabled={settingsLoading}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    Regional Settings
                  </CardTitle>
                  <CardDescription>Localization and regional preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="timezone">Default Timezone</Label>
                    <Select name="timezone" defaultValue={settings?.general.regional.timezone || "utc"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                        <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                        <SelectItem value="gmt">GMT (Greenwich Mean Time)</SelectItem>
                        <SelectItem value="cet">CET (Central European Time)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="currency">Default Currency</Label>
                    <Select name="currency" defaultValue={settings?.general.regional.currency || "usd"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="usd">USD - US Dollar</SelectItem>
                        <SelectItem value="eur">EUR - Euro</SelectItem>
                        <SelectItem value="gbp">GBP - British Pound</SelectItem>
                        <SelectItem value="nok">NOK - Norwegian Krone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="language">System Language</Label>
                    <Select name="language" defaultValue={settings?.general.regional.language || "en"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="date-format">Date Format</Label>
                    <Select name="date-format" defaultValue={settings?.general.regional.dateFormat || "mm-dd-yyyy"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mm-dd-yyyy">MM/DD/YYYY</SelectItem>
                        <SelectItem value="dd-mm-yyyy">DD/MM/YYYY</SelectItem>
                        <SelectItem value="yyyy-mm-dd">YYYY-MM-DD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5" />
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize the look and feel</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="theme">Theme</Label>
                    <Select name="theme" defaultValue={settings?.general.appearance.theme || "light"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="light">Light</SelectItem>
                        <SelectItem value="dark">Dark</SelectItem>
                        <SelectItem value="auto">Auto (System)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="logo">Company Logo</Label>
                    <div className="flex gap-2">
                      <Input id="logo" type="file" accept="image/*" className="flex-1" />
                      <Button variant="outline">
                        <Upload className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="compact-mode">Compact Mode</Label>
                      <p className="text-sm text-muted-foreground">Reduce spacing and padding</p>
                    </div>
                    <Switch id="compact-mode" defaultChecked={settings?.general.appearance.compactMode} disabled={settingsLoading} />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Data Management
                  </CardTitle>
                  <CardDescription>Data retention and cleanup policies</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="retention-period">Data Retention Period</Label>
                    <Select name="retention-period" defaultValue={settings?.general.dataManagement.retentionPeriod || "7-years"} disabled={settingsLoading}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5-years">5 Years</SelectItem>
                        <SelectItem value="7-years">7 Years</SelectItem>
                        <SelectItem value="10-years">10 Years</SelectItem>
                        <SelectItem value="indefinite">Indefinite</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-cleanup">Automatic Data Cleanup</Label>
                      <p className="text-sm text-muted-foreground">Remove old records automatically</p>
                    </div>
                    <Switch id="auto-cleanup" defaultChecked={settings?.general.dataManagement.autoCleanup} disabled={settingsLoading} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audit-logging">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Track all system changes</p>
                    </div>
                    <Switch id="audit-logging" defaultChecked={settings?.general.dataManagement.auditLogging} disabled={settingsLoading} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ranks" className="space-y-6">
            <RankManagement />
          </TabsContent>

          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium">User Management</h3>
                <p className="text-sm text-muted-foreground">Manage user accounts and permissions</p>
              </div>
              <Button className="ocean-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add User
              </Button>
            </div>

            <Card>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                        <TableCell>{new Date(user.lastLogin).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="outline" size="sm">
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>Configure what each role can access</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { permission: 'View Seafarer Profiles', admin: true, manager: true, viewer: true },
                    { permission: 'Edit Seafarer Profiles', admin: true, manager: true, viewer: false },
                    { permission: 'Delete Seafarer Records', admin: true, manager: false, viewer: false },
                    { permission: 'Process Payroll', admin: true, manager: true, viewer: false },
                    { permission: 'System Configuration', admin: true, manager: false, viewer: false },
                    { permission: 'User Management', admin: true, manager: false, viewer: false }
                  ].map((perm, idx) => (
                    <div key={idx} className="grid grid-cols-4 gap-4 items-center p-3 bg-muted/20 rounded-lg">
                      <div className="font-medium">{perm.permission}</div>
                      <div className="text-center">
                        <Switch checked={perm.admin} disabled />
                        <p className="text-xs text-muted-foreground mt-1">Admin</p>
                      </div>
                      <div className="text-center">
                        <Switch checked={perm.manager} />
                        <p className="text-xs text-muted-foreground mt-1">Manager</p>
                      </div>
                      <div className="text-center">
                        <Switch checked={perm.viewer} />
                        <p className="text-xs text-muted-foreground mt-1">Viewer</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notification Preferences
                </CardTitle>
                <CardDescription>Configure how and when you receive notifications</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notification Type</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>SMS</TableHead>
                      <TableHead>Push</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settings?.userManagement.notifications.map((notification) => (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{notification.name}</div>
                            <div className="text-sm text-muted-foreground">{notification.description}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={notification.email}
                            onCheckedChange={(checked) => updateNotification(notification.id, 'email', checked)}
                            disabled={settingsLoading}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={notification.sms}
                            onCheckedChange={(checked) => updateNotification(notification.id, 'sms', checked)}
                            disabled={settingsLoading}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={notification.push}
                            onCheckedChange={(checked) => updateNotification(notification.id, 'push', checked)}
                            disabled={settingsLoading}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP settings for email notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="smtp-server">SMTP Server</Label>
                    <Input id="smtp-server" defaultValue="smtp.seamanager.com" />
                  </div>
                  <div>
                    <Label htmlFor="smtp-port">Port</Label>
                    <Input id="smtp-port" defaultValue="587" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="smtp-username">Username</Label>
                  <Input id="smtp-username" defaultValue="notifications@seamanager.com" />
                </div>
                <div>
                  <Label htmlFor="smtp-password">Password</Label>
                  <Input id="smtp-password" type="password" placeholder="••••••••" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="smtp-ssl">Use SSL/TLS</Label>
                    <p className="text-sm text-muted-foreground">Secure email transmission</p>
                  </div>
                  <Switch id="smtp-ssl" defaultChecked />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Security Settings
                </CardTitle>
                <CardDescription>Configure security policies and authentication</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Password Policy</h4>
                    <div>
                      <Label htmlFor="min-length">Minimum Password Length</Label>
                      <Select name="min-length" defaultValue={settings?.security.passwordPolicy.minLength.toString() || "8"} disabled={settingsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="6">6 characters</SelectItem>
                          <SelectItem value="8">8 characters</SelectItem>
                          <SelectItem value="10">10 characters</SelectItem>
                          <SelectItem value="12">12 characters</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-uppercase">Require Uppercase</Label>
                        <p className="text-sm text-muted-foreground">At least one uppercase letter</p>
                      </div>
                      <Switch id="require-uppercase" defaultChecked={settings?.security.passwordPolicy.requireUppercase} disabled={settingsLoading} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-numbers">Require Numbers</Label>
                        <p className="text-sm text-muted-foreground">At least one numeric character</p>
                      </div>
                      <Switch id="require-numbers" defaultChecked={settings?.security.passwordPolicy.requireNumbers} disabled={settingsLoading} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-symbols">Require Special Characters</Label>
                        <p className="text-sm text-muted-foreground">At least one special character</p>
                      </div>
                      <Switch id="require-symbols" defaultChecked={settings?.security.passwordPolicy.requireSymbols} disabled={settingsLoading} />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Session Management</h4>
                    <div>
                      <Label htmlFor="session-timeout">Session Timeout</Label>
                      <Select name="session-timeout" defaultValue={settings?.security.sessionManagement.timeout.toString() || "60"} disabled={settingsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="60">1 hour</SelectItem>
                          <SelectItem value="120">2 hours</SelectItem>
                          <SelectItem value="480">8 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="force-logout">Force Logout on Browser Close</Label>
                        <p className="text-sm text-muted-foreground">Enhanced security for shared devices</p>
                      </div>
                      <Switch id="force-logout" defaultChecked={settings?.security.sessionManagement.forceLogoutOnClose} disabled={settingsLoading} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="concurrent-sessions">Allow Multiple Sessions</Label>
                        <p className="text-sm text-muted-foreground">Same user on multiple devices</p>
                      </div>
                      <Switch id="concurrent-sessions" defaultChecked={settings?.security.sessionManagement.allowConcurrentSessions} disabled={settingsLoading} />
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Two-Factor Authentication</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-2fa">Require 2FA for Admin Users</Label>
                        <p className="text-sm text-muted-foreground">Mandatory for administrator accounts</p>
                      </div>
                      <Switch id="require-2fa" defaultChecked={settings?.security.twoFactorAuth.requireForAdmins} disabled={settingsLoading} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="optional-2fa">Allow 2FA for All Users</Label>
                        <p className="text-sm text-muted-foreground">Optional enhanced security</p>
                      </div>
                      <Switch id="optional-2fa" defaultChecked={settings?.security.twoFactorAuth.allowForAllUsers} disabled={settingsLoading} />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>Manage API access and integration keys</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {settings?.security.apiKeys.map((apiKey, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <div className="font-medium">{apiKey.name}</div>
                        <div className="text-sm text-muted-foreground font-mono">{apiKey.key}</div>
                        <div className="text-xs text-muted-foreground">Created: {new Date(apiKey.created).toLocaleDateString()}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(apiKey.status)}
                        <Button variant="outline" size="sm">
                          <Key className="w-4 h-4 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  ))}
                  
                  <Button className="w-full" variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Generate New API Key
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>External Integrations</CardTitle>
                <CardDescription>Connect with third-party services and APIs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {settings?.integrations.integrations.map((integration, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{integration.name}</h4>
                            <p className="text-sm text-muted-foreground">{integration.description}</p>
                          </div>
                          {getStatusBadge(integration.status)}
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          Last sync: {integration.lastSync}
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full"
                          disabled={integration.status === 'connected'}
                        >
                          {integration.status === 'connected' ? 'Connected' : 'Connect'}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="backup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Backup & Recovery
                </CardTitle>
                <CardDescription>Manage data backups and system recovery</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Automatic Backups</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="auto-backup">Enable Automatic Backups</Label>
                        <p className="text-sm text-muted-foreground">Regular system backups</p>
                      </div>
                      <Switch id="auto-backup" defaultChecked={settings?.backup.automatic.enabled} disabled={settingsLoading} />
                    </div>
                    <div>
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select name="backup-frequency" defaultValue={settings?.backup.automatic.frequency || "daily"} disabled={settingsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="backup-retention">Retention Period</Label>
                      <Select name="backup-retention" defaultValue={settings?.backup.automatic.retention.toString() || "30"} disabled={settingsLoading}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="7">7 days</SelectItem>
                          <SelectItem value="30">30 days</SelectItem>
                          <SelectItem value="90">90 days</SelectItem>
                          <SelectItem value="365">1 year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Manual Backup</h4>
                    <p className="text-sm text-muted-foreground">
                      Create an immediate backup of all system data
                    </p>
                    <Button className="w-full ocean-gradient">
                      <Download className="w-4 h-4 mr-2" />
                      Create Backup Now
                    </Button>
                    
                    <div className="border-t pt-4">
                      <h4 className="font-medium mb-2">Restore from Backup</h4>
                      <div className="flex gap-2">
                        <Input type="file" accept=".backup" className="flex-1" />
                        <Button variant="outline">
                          <Upload className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-sm text-warning">
                        <AlertTriangle className="w-4 h-4" />
                        This will overwrite current data
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Recent Backups</h4>
                  <div className="space-y-2">
                    {settings?.backup.manual.backups.map((backup, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                        <div>
                          <div className="font-medium">{backup.date}</div>
                          <div className="text-sm text-muted-foreground">{backup.size}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant={backup.status === 'completed' ? 'default' : 'destructive'}
                            className={backup.status === 'completed' ? 'bg-success/20 text-success-foreground' : ''}
                          >
                            {backup.status}
                          </Badge>
                          {backup.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
  );
}