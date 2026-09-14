import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Building2, Users, Ship, Settings, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCompanies, useCompanyStats } from '@/hooks/queries/useCompanyQueries';
import { CompanyForm } from '@/components/companies/CompanyForm';
import { Company } from '@/lib/schemas_v2';
import { exportToCSV } from '@/lib/utils/exportUtils';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/config/routes';

function CompanyCard({ company }: { company: Company }) {
  const navigate = useNavigate();
  const { data: stats } = useCompanyStats(company.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              {company.name}
            </CardTitle>
            <CardDescription>{company.email}</CardDescription>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-200">
            Active
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="text-sm text-muted-foreground">
            <p>{company.address}</p>
            <p className="flex items-center gap-2 mt-1">
              <span>📞 {company.phone}</span>
            </p>
            {company.website && (
              <p className="flex items-center gap-2 mt-1">
                <span>🌐 {company.website}</span>
              </p>
            )}
          </div>
          
          {stats && (
            <div className="grid grid-cols-3 gap-4 pt-3 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Ship className="h-4 w-4" />
                  Vessels
                </div>
                <div className="text-lg font-semibold">
                  {stats.activeVessels}/{stats.totalVessels}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Crew
                </div>
                <div className="text-lg font-semibold">
                  {stats.activeSeafarers}/{stats.totalSeafarers}
                </div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <Settings className="h-4 w-4" />
                  Assignments
                </div>
                <div className="text-lg font-semibold">
                  {stats.activeAssignments}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="flex w-full gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                Edit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Edit Company</DialogTitle>
              </DialogHeader>
              <CompanyForm company={company} />
            </DialogContent>
          </Dialog>
          <Button size="sm" className="flex-1" onClick={() => navigate(ROUTES.COMPANIES.DETAILS(company.id))}>
            View Details
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

export default function Companies() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const { data: companies = [], isLoading } = useCompanies({
    search: searchTerm,
  });

  const handleExportCompanies = () => {
    try {
      const exportData = companies.map(company => ({
        'Name': company.name,
        'Email': company.email,
        'Phone': company.phone,
        'Address': company.address,
        'Website': company.website || '',
        'Active Vessels': company.stats?.activeVessels || 0,
        'Total Vessels': company.stats?.totalVessels || 0,
        'Active Seafarers': company.stats?.activeSeafarers || 0,
        'Total Seafarers': company.stats?.totalSeafarers || 0,
        'Active Assignments': company.stats?.activeAssignments || 0
      }));

      exportToCSV(exportData, undefined, `companies_data_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported ${companies.length} companies to CSV`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export companies data",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Companies</h1>
          <p className="text-muted-foreground">
            Manage shipping companies and their maritime operations
          </p>
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={handleExportCompanies}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Company
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create New Company</DialogTitle>
              </DialogHeader>
              <CompanyForm
                onSuccess={() => setIsCreateDialogOpen(false)}
                onCancel={() => setIsCreateDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-4 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search companies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No companies found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No companies match your search criteria.' : 'Get started by creating your first shipping company.'}
            </p>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Company
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Create New Company</DialogTitle>
                </DialogHeader>
                <CompanyForm 
                  onSuccess={() => setIsCreateDialogOpen(false)}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {companies.map((company) => (
            <CompanyCard key={company.id} company={company} />
          ))}
        </div>
      )}
    </div>
  );
}