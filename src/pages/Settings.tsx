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

const mockUsers: User[] = [
  {
    id: '1',
    name: 'Admin User',
    email: 'admin@seamanager.com',
    role: 'admin',
    status: 'active',
    lastLogin: '2024-01-20'
  },
  {
    id: '2',
    name: 'HR Manager',
    email: 'hr@seamanager.com',
    role: 'manager',
    status: 'active',
    lastLogin: '2024-01-19'
  },
  {
    id: '3',
    name: 'Fleet Coordinator',
    email: 'fleet@seamanager.com',
    role: 'manager',
    status: 'active',
    lastLogin: '2024-01-18'
  },
  {
    id: '4',
    name: 'Viewer User',
    email: 'viewer@seamanager.com',
    role: 'viewer',
    status: 'inactive',
    lastLogin: '2024-01-15'
  }
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
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [notifications, setNotifications] = useState<NotificationSetting[]>(notificationSettings);
  const [activeTab, setActiveTab] = useState('general');

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
    setNotifications(prev => prev.map(notification => 
      notification.id === id ? { ...notification, [field]: value } : notification
    ));
  };

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
            <Button className="ocean-gradient">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">General</TabsTrigger>
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
                    <Input id="company-name" defaultValue="SeaManager Maritime Solutions" />
                  </div>
                  <div>
                    <Label htmlFor="company-email">Contact Email</Label>
                    <Input id="company-email" type="email" defaultValue="contact@seamanager.com" />
                  </div>
                  <div>
                    <Label htmlFor="company-phone">Phone Number</Label>
                    <Input id="company-phone" defaultValue="+1-555-0123" />
                  </div>
                  <div>
                    <Label htmlFor="company-address">Address</Label>
                    <Textarea id="company-address" defaultValue="123 Harbor Street, Maritime City, MC 12345" />
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
                    <Select defaultValue="utc">
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
                    <Select defaultValue="usd">
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
                    <Select defaultValue="en">
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
                    <Select defaultValue="mm-dd-yyyy">
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
                    <Select defaultValue="light">
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
                    <Switch id="compact-mode" />
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
                    <Select defaultValue="7-years">
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
                    <Switch id="auto-cleanup" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="audit-logging">Audit Logging</Label>
                      <p className="text-sm text-muted-foreground">Track all system changes</p>
                    </div>
                    <Switch id="audit-logging" defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
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
                    {notifications.map((notification) => (
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
                          />
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={notification.sms}
                            onCheckedChange={(checked) => updateNotification(notification.id, 'sms', checked)}
                          />
                        </TableCell>
                        <TableCell>
                          <Switch 
                            checked={notification.push}
                            onCheckedChange={(checked) => updateNotification(notification.id, 'push', checked)}
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
                      <Select defaultValue="8">
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
                      <Switch id="require-uppercase" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-numbers">Require Numbers</Label>
                        <p className="text-sm text-muted-foreground">At least one numeric character</p>
                      </div>
                      <Switch id="require-numbers" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="require-symbols">Require Special Characters</Label>
                        <p className="text-sm text-muted-foreground">At least one special character</p>
                      </div>
                      <Switch id="require-symbols" />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Session Management</h4>
                    <div>
                      <Label htmlFor="session-timeout">Session Timeout</Label>
                      <Select defaultValue="60">
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
                      <Switch id="force-logout" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="concurrent-sessions">Allow Multiple Sessions</Label>
                        <p className="text-sm text-muted-foreground">Same user on multiple devices</p>
                      </div>
                      <Switch id="concurrent-sessions" defaultChecked />
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
                      <Switch id="require-2fa" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="optional-2fa">Allow 2FA for All Users</Label>
                        <p className="text-sm text-muted-foreground">Optional enhanced security</p>
                      </div>
                      <Switch id="optional-2fa" defaultChecked />
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
                  {[
                    { name: 'Mobile App API', key: 'sk_live_••••••••••••1234', created: '2024-01-15', status: 'active' },
                    { name: 'Third-party Integration', key: 'sk_live_••••••••••••5678', created: '2024-01-10', status: 'active' },
                    { name: 'Webhook Endpoint', key: 'sk_live_••••••••••••9012', created: '2024-01-05', status: 'inactive' }
                  ].map((apiKey, idx) => (
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
                  {[
                    {
                      name: 'Accounting System',
                      description: 'Sync payroll data with QuickBooks',
                      status: 'connected',
                      lastSync: '2024-01-20 14:30'
                    },
                    {
                      name: 'Email Service',
                      description: 'SendGrid for notification delivery',
                      status: 'connected',
                      lastSync: '2024-01-20 15:45'
                    },
                    {
                      name: 'SMS Provider',
                      description: 'Twilio for SMS notifications',
                      status: 'disconnected',
                      lastSync: 'Never'
                    },
                    {
                      name: 'Document Storage',
                      description: 'AWS S3 for certificate storage',
                      status: 'connected',
                      lastSync: '2024-01-20 16:15'
                    },
                    {
                      name: 'Maritime Database',
                      description: 'IMO vessel information lookup',
                      status: 'connected',
                      lastSync: '2024-01-20 12:00'
                    },
                    {
                      name: 'Training Provider',
                      description: 'Online training platform API',
                      status: 'disconnected',
                      lastSync: 'Never'
                    }
                  ].map((integration, idx) => (
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
                      <Switch id="auto-backup" defaultChecked />
                    </div>
                    <div>
                      <Label htmlFor="backup-frequency">Backup Frequency</Label>
                      <Select defaultValue="daily">
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
                      <Select defaultValue="30">
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
                    {[
                      { date: '2024-01-20 02:00', size: '2.4 GB', status: 'completed' },
                      { date: '2024-01-19 02:00', size: '2.3 GB', status: 'completed' },
                      { date: '2024-01-18 02:00', size: '2.3 GB', status: 'completed' },
                      { date: '2024-01-17 02:00', size: '2.2 GB', status: 'failed' },
                      { date: '2024-01-16 02:00', size: '2.2 GB', status: 'completed' }
                    ].map((backup, idx) => (
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