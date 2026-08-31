import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2, Edit, Trash2, User, Mail, Phone, MapPin, Calendar, DollarSign, Ship } from 'lucide-react';
import { ROUTES } from '@/config/routes';
import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import type { Seafarer } from '@/lib/schemas_v2';

export default function SeafarerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [seafarer, setSeafarer] = useState<Seafarer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!id) return;
      setIsLoading(true);
      try {
        const data = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, id);
        if (!cancelled) setSeafarer(data || null);
      } catch (error) {
        console.error('Failed to load seafarer:', error);
        if (!cancelled) setSeafarer(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDelete = async () => {
    if (!id) return;

    if (window.confirm('Are you sure you want to delete this seafarer?')) {
      try {
        setIsDeleting(true);
        await db.delete(STORE_NAMES.SEAFARERS, id);
        toast.success('Seafarer deleted successfully');
        navigate(ROUTES.PERSONNEL.LIST);
      } catch (error) {
        console.error('Failed to delete seafarer:', error);
        toast.error('Failed to delete seafarer');
      } finally {
        setIsDeleting(false);
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

  if (!seafarer) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading seafarer. Please try again later.</p>
      </div>
    );
  }

  const personal = seafarer.personalInfo || {} as Seafarer['personalInfo'];
  const employment = seafarer.employment || {} as Seafarer['employment'];
  const fullName = `${personal.firstName || ''} ${personal.lastName || ''}`.trim();
  const status = employment.status || 'on_leave';
  const primaryAddress = personal.address?.city
    ? [personal.address.city, personal.address.state, personal.address.country]
        .filter(Boolean)
        .join(', ')
    : personal.placeOfBirth || '';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Seafarer Details</h1>
          <p className="text-muted-foreground">View and manage seafarer information</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate(ROUTES.PERSONNEL.LIST)}>
            Back to Personnel
          </Button>
          <Button variant="outline" onClick={() => navigate(`/personnel/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
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
                  <h3 className="text-lg font-medium">{fullName}</h3>
                  <p className="text-sm text-muted-foreground">{employment.rank}</p>
                  <Badge className="mt-2" variant={status === 'onboard' ? 'default' : 'secondary'}>
                    {status}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Nationality</span>
                  <span className="text-sm font-medium">{personal.nationality || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Date of Birth</span>
                  <span className="text-sm font-medium">
                    {personal.dateOfBirth ? format(new Date(personal.dateOfBirth), 'MMM d, yyyy') : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium">
                    {seafarer.createdAt ? format(new Date(seafarer.createdAt), 'MMM d, yyyy') : '—'}
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
                      <p className="font-medium">{fullName}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{personal.contact?.email || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{personal.contact?.phone || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{primaryAddress || '—'}</p>
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
                    <p className="font-medium">{employment.rank}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge variant={status === 'onboard' ? 'default' : 'secondary'}>{status}</Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Base Wage</p>
                      <p className="font-medium">
                        {employment.wageCurrency || 'USD'} {employment.baseWage ?? 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Joined Date</p>
                      <p className="font-medium">
                        {employment.joinedDate ? format(new Date(employment.joinedDate), 'MMM d, yyyy') : '—'}
                      </p>
                    </div>
                  </div>
                </div>
                {employment.currentVesselId && (
                  <div className="flex items-center space-x-2">
                    <Ship className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Assigned Vessel</p>
                      <p className="font-medium">{employment.currentVesselName || employment.currentVesselId}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {(seafarer.documents?.length || 0) > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Certifications</CardTitle>
                <CardDescription>Professional certifications and licenses</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {seafarer.documents?.map((cert, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">{cert.type}</h4>
                          <p className="text-sm text-muted-foreground">{cert.number}</p>
                        </div>
                        {cert.expiryDate && (
                          <Badge variant={new Date(cert.expiryDate) < new Date() ? 'destructive' : 'secondary'}>
                            Expires {format(new Date(cert.expiryDate), 'MMM d, yyyy')}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        Issued: {cert.issueDate ? format(new Date(cert.issueDate), 'MMM d, yyyy') : '—'}
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
