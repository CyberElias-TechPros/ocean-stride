import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Users, 
  Filter,
  MoreHorizontal,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db, type Seafarer } from '@/lib/database';

export default function Personnel() {
  const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const loadSeafarers = async () => {
      try {
        await db.init();
        const allSeafarers = await db.getAll<Seafarer>('seafarers');
        setSeafarers(allSeafarers);
      } catch (error) {
        console.error('Failed to load seafarers:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSeafarers();
  }, []);

  const filteredSeafarers = seafarers.filter(seafarer => {
    const matchesSearch = 
      seafarer.personalInfo.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seafarer.personalInfo.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seafarer.personalInfo.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      seafarer.qualifications.rank.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || seafarer.employment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-primary text-primary-foreground';
      case 'onboard': return 'bg-success text-success-foreground';
      case 'available': return 'bg-accent text-accent-foreground';
      case 'leave': return 'bg-warning text-warning-foreground';
      case 'inactive': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const statusCounts = {
    all: seafarers.length,
    active: seafarers.filter(s => s.employment.status === 'active').length,
    onboard: seafarers.filter(s => s.employment.status === 'onboard').length,
    available: seafarers.filter(s => s.employment.status === 'available').length,
    leave: seafarers.filter(s => s.employment.status === 'leave').length,
    inactive: seafarers.filter(s => s.employment.status === 'inactive').length,
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading personnel...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Personnel Management</h1>
            <p className="text-muted-foreground">Manage your seafarer database</p>
          </div>
          <Button className="ocean-gradient shadow-ocean">
            <Plus className="w-4 h-4 mr-2" />
            Add Seafarer
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or rank..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {Object.entries(statusCounts).map(([status, count]) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
                className="capitalize"
              >
                {status} ({count})
              </Button>
            ))}
          </div>
        </div>

        {/* Personnel Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSeafarers.map((seafarer) => (
            <Card key={seafarer.id} className="transition-smooth hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {seafarer.qualifications.rank}
                      </p>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Profile</DropdownMenuItem>
                      <DropdownMenuItem>Edit Details</DropdownMenuItem>
                      <DropdownMenuItem>Assign to Vessel</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Deactivate
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge className={getStatusColor(seafarer.employment.status)}>
                    {seafarer.employment.status}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {seafarer.personalInfo.nationality}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span className="truncate">{seafarer.personalInfo.email}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{seafarer.personalInfo.phone}</span>
                  </div>
                  {seafarer.employment.currentVessel && (
                    <div className="flex items-center space-x-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>{seafarer.employment.currentVessel}</span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-border">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Basic Wage</span>
                    <span>${seafarer.financial.basicWage.toLocaleString()} {seafarer.financial.currency}</span>
                  </div>
                  {seafarer.employment.contractEnd && (
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Contract Ends</span>
                      <span>{new Date(seafarer.employment.contractEnd).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredSeafarers.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No seafarers found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || statusFilter !== 'all' 
                  ? 'Try adjusting your search or filters'
                  : 'Start by adding your first seafarer to the system'
                }
              </p>
              {!searchQuery && statusFilter === 'all' && (
                <Button className="ocean-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Seafarer
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}