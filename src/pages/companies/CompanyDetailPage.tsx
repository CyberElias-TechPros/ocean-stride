import { useParams, useNavigate } from 'react-router-dom';
import { useCompany, useUpdateCompany, useDeleteCompany, useCompanyStats } from '@/hooks/queries/useCompanyQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Edit, Trash2, Building2, Users, Ship, Settings } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: company, isLoading, isError } = useCompany(id || '');
  const updateCompany = useUpdateCompany(id || '');
  const deleteCompany = useDeleteCompany();
  const { data: stats } = useCompanyStats(id || '');

  const handleDelete = async () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to delete this company?')) {
      try {
        await deleteCompany.mutateAsync(id);
        toast.success('Company deleted successfully');
        navigate(ROUTES.COMPANIES.LIST);
      } catch (error) {
        toast.error('Failed to delete company');
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading company. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Company Details</h1>
          <p className="text-muted-foreground">View and manage company information</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.COMPANIES.LIST)}
          >
            Back to Companies
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/companies/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteCompany.isPending}
          >
            {deleteCompany.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-blue-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">{company.name}</h3>
                  <p className="text-sm text-muted-foreground">{company.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Phone</span>
                  <span className="text-sm font-medium">{company.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Website</span>
                  <span className="text-sm font-medium">
                    {company.website ? (
                      <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                        {company.website}
                      </a>
                    ) : (
                      'N/A'
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {format(new Date(company.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Last Updated</span>
                  <span className="text-sm font-medium">
                    {format(new Date(company.updatedAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Basic information about the company</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Company Name</p>
                    <p className="font-medium">{company.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email Address</p>
                    <p className="font-medium">{company.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone Number</p>
                    <p className="font-medium">{company.phone}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <p className="font-medium">
                      {company.website ? (
                        <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          {company.website}
                        </a>
                      ) : (
                        'N/A'
                      )}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{company.address}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {stats && (
            <Card>
              <CardHeader>
                <CardTitle>Company Statistics</CardTitle>
                <CardDescription>Overview of company operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <Ship className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-blue-600">
                      {stats.totalVessels}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Vessels</div>
                    <div className="text-xs text-green-600">
                      {stats.activeVessels} active
                    </div>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-green-600">
                      {stats.totalSeafarers}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Seafarers</div>
                    <div className="text-xs text-green-600">
                      {stats.activeSeafarers} active
                    </div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-purple-600">
                      {stats.totalAssignments}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Assignments</div>
                    <div className="text-xs text-purple-600">
                      {stats.activeAssignments} active
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}