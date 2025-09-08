import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Ship, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertCircle,
  Shield,
  Smartphone,
  Users,
  Settings
} from 'lucide-react';

interface LoginCredentials {
  email: string;
  password: string;
  userType: 'admin' | 'manager' | 'seafarer';
}

const demoAccounts = {
  admin: {
    email: 'admin@seamanager.com',
    password: 'admin123',
    name: 'System Administrator',
    permissions: ['Full System Access', 'User Management', 'Settings', 'Reports']
  },
  manager: {
    email: 'manager@seamanager.com',
    password: 'manager123',
    name: 'HR Manager',
    permissions: ['Crew Management', 'Payroll', 'Compliance', 'Fleet Operations']
  },
  seafarer: {
    email: 'seafarer@seamanager.com',
    password: 'seafarer123',
    name: 'John Smith - Chief Engineer',
    permissions: ['View Profile', 'Check Payslips', 'Update Certificates', 'Time Tracking']
  }
};

interface LoginFormProps {
  onLogin: (credentials: LoginCredentials) => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: '',
    userType: 'admin'
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const demoAccount = demoAccounts[credentials.userType];
    
    if (credentials.email === demoAccount.email && credentials.password === demoAccount.password) {
      onLogin(credentials);
    } else {
      setError('Invalid email or password. Please use the demo credentials provided.');
    }
    
    setIsLoading(false);
  };

  const handleDemoLogin = (userType: 'admin' | 'manager' | 'seafarer') => {
    const account = demoAccounts[userType];
    setCredentials({
      email: account.email,
      password: account.password,
      userType
    });
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'admin': return <Settings className="w-5 h-5" />;
      case 'manager': return <Users className="w-5 h-5" />;
      case 'seafarer': return <Ship className="w-5 h-5" />;
      default: return <Users className="w-5 h-5" />;
    }
  };

  const getUserTypeColor = (type: string) => {
    switch (type) {
      case 'admin': return 'bg-destructive/20 text-destructive-foreground';
      case 'manager': return 'bg-primary/20 text-primary-foreground';
      case 'seafarer': return 'bg-success/20 text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <Ship className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">SeaManager</h1>
          <p className="text-muted-foreground">Comprehensive Seafarer Management System</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Login Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Sign In
              </CardTitle>
              <CardDescription>
                Access your seafarer management dashboard
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <Tabs 
                  value={credentials.userType} 
                  onValueChange={(value) => setCredentials(prev => ({ ...prev, userType: value as any }))}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="admin">Admin</TabsTrigger>
                    <TabsTrigger value="manager">Manager</TabsTrigger>
                    <TabsTrigger value="seafarer">Seafarer</TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={credentials.email}
                        onChange={(e) => setCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-9"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        value={credentials.password}
                        onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="pl-9 pr-9"
                        required
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full ocean-gradient" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </Button>

                <div className="text-center">
                  <Button variant="link" size="sm">
                    Forgot your password?
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Demo Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Demo Accounts
              </CardTitle>
              <CardDescription>
                Try the system with different user roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(demoAccounts).map(([type, account]) => (
                <Card key={type} className="cursor-pointer transition-all hover:shadow-md" onClick={() => handleDemoLogin(type as any)}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getUserTypeIcon(type)}
                        <div>
                          <h4 className="font-medium">{account.name}</h4>
                          <p className="text-sm text-muted-foreground">{account.email}</p>
                        </div>
                      </div>
                      <Badge className={getUserTypeColor(type)}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium">Permissions:</p>
                      <div className="flex flex-wrap gap-1">
                        {account.permissions.slice(0, 3).map((permission, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {account.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{account.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Password: {account.password}</span>
                        <Button variant="outline" size="sm" onClick={() => handleDemoLogin(type as any)}>
                          Use Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              <Alert>
                <Smartphone className="h-4 w-4" />
                <AlertDescription>
                  <strong>Mobile Ready:</strong> This system is fully responsive and works on all devices including tablets and smartphones for onboard use.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-8 text-sm text-muted-foreground">
          <p>© 2024 SeaManager. Maritime crew management solution.</p>
          <p>This is a demonstration system showcasing full seafarer management capabilities.</p>
        </div>
      </div>
    </div>
  );
}