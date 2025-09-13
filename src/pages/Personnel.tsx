import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Plus, 
  Users, 
  Filter,
  MoreHorizontal,
  User,
  Mail,
  Phone,
  MapPin,
  Edit,
  Trash2,
  Ship,
  FileText,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { db, type Seafarer } from '@/lib/database';
import { useCompany } from '@/context/CompanyContext';

export default function Personnel() {
  const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedSeafarer, setSelectedSeafarer] = useState<Seafarer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    const loadSeafarers = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        const allSeafarers = await db.getSeafarersByCompany(selectedCompany.id);
        setSeafarers(allSeafarers);
      } catch (error) {
        console.error('Failed to load seafarers:', error);
        toast({
          title: "Error",
          description: "Failed to load seafarers",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadSeafarers();
  }, [selectedCompany, toast]);

  const handleAddSeafarer = async (seafarerData: Partial<Seafarer>) => {
    if (!selectedCompany) return;
    
    try {
      const newSeafarer = await db.createSeafarer({
        ...seafarerData,
        companyId: selectedCompany.id
      } as Seafarer);
      
      setSeafarers(prev => [...prev, newSeafarer]);
      setShowAddDialog(false);
      toast({
        title: "Success",
        description: "Seafarer added successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add seafarer",
        variant: "destructive"
      });
    }
  };

  const handleEditSeafarer = async (seafarerData: Partial<Seafarer>) => {
    if (!selectedSeafarer) return;
    
    try {
      const updatedSeafarer = await db.updateSeafarer(selectedSeafarer.id!, seafarerData);
      setSeafarers(prev => prev.map(s => s.id === selectedSeafarer.id ? updatedSeafarer : s));
      setShowEditDialog(false);
      setSelectedSeafarer(null);
      toast({
        title: "Success",
        description: "Seafarer updated successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update seafarer",
        variant: "destructive"
      });
    }
  };

  const handleDeleteSeafarer = async (seafarerId: string) => {
    try {
      await db.deleteSeafarer(seafarerId);
      setSeafarers(prev => prev.filter(s => s.id !== seafarerId));
      toast({
        title: "Success",
        description: "Seafarer deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete seafarer",
        variant: "destructive"
      });
    }
  };

  const handleAssignToVessel = async (seafarerId: string, vesselName: string) => {
    try {
      await db.updateSeafarer(seafarerId, {
        employment: {
          ...seafarers.find(s => s.id === seafarerId)?.employment,
          currentVessel: vesselName,
          status: 'onboard'
        }
      });
      
      // Reload seafarers
      const updatedSeafarers = await db.getSeafarersByCompany(selectedCompany!.id);
      setSeafarers(updatedSeafarers);
      
      toast({
        title: "Success",
        description: `Seafarer assigned to ${vesselName}`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign seafarer to vessel",
        variant: "destructive"
      });
    }
  };

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
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="ocean-gradient shadow-ocean">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Seafarer
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Seafarer</DialogTitle>
                  <DialogDescription>
                    Enter seafarer details to add them to the system
                  </DialogDescription>
                </DialogHeader>
                <SeafarerForm onSubmit={handleAddSeafarer} />
              </DialogContent>
            </Dialog>
          </div>
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
                      <DropdownMenuItem onClick={() => {
                        setSelectedSeafarer(seafarer);
                        // Could open a detailed profile view
                      }}>
                        <FileText className="w-4 h-4 mr-2" />
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setSelectedSeafarer(seafarer);
                        setShowEditDialog(true);
                      }}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Open vessel selection dialog
                        handleAssignToVessel(seafarer.id!, 'MV Example Vessel');
                      }}>
                        <Ship className="w-4 h-4 mr-2" />
                        Assign to Vessel
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this seafarer?')) {
                            handleDeleteSeafarer(seafarer.id!);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
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
                <Button className="ocean-gradient" onClick={() => setShowAddDialog(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Seafarer
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Edit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Seafarer</DialogTitle>
              <DialogDescription>
                Update seafarer information
              </DialogDescription>
            </DialogHeader>
            {selectedSeafarer && (
              <SeafarerForm 
                initialData={selectedSeafarer} 
                onSubmit={handleEditSeafarer} 
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}

// Seafarer Form Component
function SeafarerForm({ 
  initialData, 
  onSubmit 
}: { 
  initialData?: Seafarer; 
  onSubmit: (data: Partial<Seafarer>) => void;
}) {
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: initialData?.personalInfo.firstName || '',
      lastName: initialData?.personalInfo.lastName || '',
      email: initialData?.personalInfo.email || '',
      phone: initialData?.personalInfo.phone || '',
      nationality: initialData?.personalInfo.nationality || '',
      dateOfBirth: initialData?.personalInfo.dateOfBirth || '',
      passportNumber: initialData?.personalInfo.passportNumber || '',
      seamanBook: initialData?.personalInfo.seamanBook || '',
    },
    qualifications: {
      rank: initialData?.qualifications.rank || '',
      certificates: initialData?.qualifications.certificates || [],
    },
    employment: {
      status: initialData?.employment.status || 'available' as const,
      currentVessel: initialData?.employment.currentVessel || '',
      signOnDate: initialData?.employment.signOnDate || '',
      contractEnd: initialData?.employment.contractEnd || '',
    },
    financial: {
      basicWage: initialData?.financial.basicWage || 0,
      currency: initialData?.financial.currency || 'USD',
      allotments: initialData?.financial.allotments || [],
    }
  });

  const ranks = [
    'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
    'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
    'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Cook', 'Steward'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={formData.personalInfo.firstName}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, firstName: e.target.value }
            }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={formData.personalInfo.lastName}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, lastName: e.target.value }
            }))}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.personalInfo.email}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, email: e.target.value }
            }))}
            required
          />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.personalInfo.phone}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              personalInfo: { ...prev.personalInfo, phone: e.target.value }
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="rank">Rank</Label>
          <Select
            value={formData.qualifications.rank}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              qualifications: { ...prev.qualifications, rank: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rank" />
            </SelectTrigger>
            <SelectContent>
              {ranks.map(rank => (
                <SelectItem key={rank} value={rank}>{rank}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select
            value={formData.employment.status}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              employment: { ...prev.employment, status: value as any }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="onboard">Onboard</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="leave">On Leave</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="basicWage">Basic Wage</Label>
          <Input
            id="basicWage"
            type="number"
            value={formData.financial.basicWage}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              financial: { ...prev.financial, basicWage: Number(e.target.value) }
            }))}
          />
        </div>
        <div>
          <Label htmlFor="currency">Currency</Label>
          <Select
            value={formData.financial.currency}
            onValueChange={(value) => setFormData(prev => ({
              ...prev,
              financial: { ...prev.financial, currency: value }
            }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
              <SelectItem value="NOK">NOK</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button type="submit" className="flex-1 ocean-gradient">
          {initialData ? 'Update' : 'Add'} Seafarer
        </Button>
      </div>
    </form>
  );
}