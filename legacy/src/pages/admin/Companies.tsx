import React, { useState } from 'react';
import { useMultiCompany } from '@/context/MultiCompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function CompaniesPage() {
  const { companies, isLoading, createCompany } = useMultiCompany();
  const [isCreating, setIsCreating] = useState(false);
  const [newCompany, setNewCompany] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const { toast } = useToast();

  const handleCreateCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name.trim()) {
      toast({
        title: 'Error',
        description: 'Company name is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsCreating(true);
      
      // Create company data with required fields
      const companyData = {
        name: newCompany.name.trim(),
        email: newCompany.email?.trim() || '',
        phone: newCompany.phone?.trim() || '',
        address: newCompany.address?.trim() || '',
        website: '',
        logoUrl: '',
        taxId: '',
        settings: {
          currency: 'USD',
          dateFormat: 'MM/dd/yyyy',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
      };
      
      setNewCompany({ name: '', email: '', phone: '', address: '' });
      toast({
        title: 'Success',
        description: 'Company created successfully',
      });
    } catch (error) {
      console.error('Error creating company:', error);
      toast({
        title: 'Error',
        description: 'Failed to create company',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">Manage your companies and their settings</p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Add New Company</CardTitle>
            <CardDescription>Create a new company profile</CardDescription>
          </CardHeader>
          <form onSubmit={handleCreateCompany}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="name">
                    Company Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    id="name"
                    placeholder="Acme Inc."
                    value={newCompany.name}
                    onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="email">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="contact@example.com"
                    value={newCompany.email}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="phone">
                    Phone
                  </label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 000-0000"
                    value={newCompany.phone}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium leading-none" htmlFor="address">
                    Address
                  </label>
                  <Input
                    id="address"
                    placeholder="123 Main St, City, Country"
                    value={newCompany.address}
                    onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Company
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle>{company.name}</CardTitle>
                    <CardDescription>{company.email}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {company.phone && <div>📞 {company.phone}</div>}
                  {company.address && <div>📍 {company.address}</div>}
                  <div className="text-muted-foreground text-xs mt-2">
                    Created: {new Date(company.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
