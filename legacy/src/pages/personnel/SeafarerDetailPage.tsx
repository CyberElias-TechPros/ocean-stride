import { useParams, useNavigate } from 'react-router-dom';
import { useCrewMember, useUpdateCrewMember, useDeleteCrewMember } from '@/hooks/queries/useCrewQueries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Edit, Trash2, User, Mail, Phone, MapPin, Calendar, DollarSign } from 'lucide-react';
import { ROUTES } from '@/config/routes';

export default function SeafarerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: seafarer, isLoading, isError } = useCrewMember(id || '');
  const updateSeafarer = useUpdateCrewMember(id || '');
  const deleteSeafarer = useDeleteCrewMember();

  const handleDelete = async () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to delete this seafarer?')) {
      try {
        await deleteSeafarer.mutateAsync(id);
        toast.success('Seafarer deleted successfully');
        navigate(ROUTES.PERSONNEL);
      } catch (error) {
        toast.error('Failed to delete seafarer');
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

  if (isError || !seafarer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading seafarer. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seafarer Details</h1>
          <p className="text-muted-foreground">View and manage seafarer information</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => navigate(ROUTES.PERSONNEL)}
          >
            Back to Personnel
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/personnel/${id}/edit`)}
          >
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteSeafarer.isPending}
          >
            {deleteSeafarer.isPending ? (
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
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-primary" />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium">
                    {seafarer.firstName} {seafarer.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground">{seafarer.rank}</p>
                  <Badge className="mt-2" variant={seafarer.status === 'active' ? 'default' : 'secondary'}>
                    {seafarer.status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nationality</span>
                  <span className="text-sm font-medium">{seafarer.nationality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span className="text-sm font-medium">
                    {format(new Date(seafarer.dateOfBirth), 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {format(new Date(seafarer.createdAt), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{seafarer.firstName} {seafarer.lastName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{seafarer.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{seafarer.phoneNumber || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Nationality</p>
                      <p className="font-medium">{seafarer.nationality}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Employment Information</CardTitle>
              <CardDescription>Current employment details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Rank</p>
                    <p className="font-medium">{seafarer.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={seafarer.status === 'active' ? 'default' : 'secondary'}>
                      {seafarer.status}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date of Birth</p>
                      <p className="font-medium">{format(new Date(seafarer.dateOfBirth), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Member Since</p>
                      <p className="font-medium">{format(new Date(seafarer.createdAt), 'MMM d, yyyy')}</p>
                    </div>
                  </div>
                </div>
                {seafarer.vesselId && (
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned Vessel ID</p>
                    <p className="font-medium">{seafarer.vesselId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {seafarer.certifications && seafarer.certifications.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
                <CardDescription>Professional certifications and licenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seafarer.certifications.map((cert, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{cert.name}</h4>
                          <p className="text-sm text-muted-foreground">{cert.issuingAuthority}</p>
                        </div>
                        {cert.expiryDate && (
                          <Badge variant={new Date(cert.expiryDate) < new Date() ? 'destructive' : 'secondary'}>
                            Expires {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Issued: {format(new Date(cert.issueDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}