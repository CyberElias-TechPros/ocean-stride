import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { ROUTES } from '@/config/routes';
import { validateEmail, validatePassword } from '@/lib/security';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateEmail(email)) {
      toast({ title: 'Error', description: 'Invalid email address', variant: 'destructive' });
      return;
    }
    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      toast({ title: 'Error', description: passwordCheck.errors[0] || 'Weak password', variant: 'destructive' });
      return;
    }

    try {
      setIsLoading(true);
      const response = await authService.register({ email, name, password });
      toast({
        title: 'Account created',
        description: `Welcome, ${response.user.name}. You are signed in as ${response.user.role}.`,
      });
      navigate(ROUTES.DASHBOARD, { replace: true });
    } catch (error) {
      console.error('Registration failed:', error);
      toast({
        title: 'Registration failed',
        description: error instanceof Error ? error.message : 'Unable to create account',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 rounded-lg border bg-background p-8 shadow-sm">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            The first account becomes the organisation administrator.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters with upper, lower and numeric characters.
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to={ROUTES.LOGIN} className="underline underline-offset-4 hover:text-primary">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
