import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { ROUTES } from '@/config/routes';
import {
  Plus,
  Users,
  MoreHorizontal,
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
import { DataTable, ColumnConfig } from '@/components/ui/data-table';
import { db } from '@/lib/database2';
import type { Seafarer } from '@/lib/schemas_v2';
import { STORE_NAMES } from '@/lib/schemas';
import { useCompany } from '@/context/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { exportToCSV } from '@/lib/utils/exportUtils';
import { Tabs, TabsContent } from '@radix-ui/react-tabs';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';

export default function Personnel() {
   const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
   const [vessels, setVessels] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [showAddDialog, setShowAddDialog] = useState(false);
   const [selectedSeafarer, setSelectedSeafarer] = useState<Seafarer | null>(null);
   const [showEditDialog, setShowEditDialog] = useState(false);
   const [showAssignDialog, setShowAssignDialog] = useState(false);
   const [selectedVessel, setSelectedVessel] = useState<string>('');
   const { selectedCompany } = useCompany();
   const { user } = useAuth();
   const { toast } = useToast();
   const navigate = useNavigate();

   const seafarerColumns: ColumnConfig<Seafarer>[] = [
     {
       id: 'name',
       header: 'Name',
       accessor: (row) => `${row.personalInfo.firstName} ${row.personalInfo.lastName}`,
       sortable: true,
       sortKey: (row) => `${row.personalInfo.firstName} ${row.personalInfo.lastName}`,
     },
     {
       id: 'rank',
       header: 'Rank',
       accessor: (row) => row.employment.rank,
       sortable: true,
       filterable: true,
       sortKey: (row) => row.employment.rank,
     },
     {
       id: 'status',
       header: 'Status',
       accessor: (row) => row.employment.status,
       sortable: true,
       filterable: true,
       sortKey: (row) => row.employment.status,
       cell: (value) => (
         <Badge className={getStatusColor(value)}>
           {value}
         </Badge>
       ),
     },
     {
       id: 'nationality',
       header: 'Nationality',
       accessor: (row) => row.personalInfo.nationality,
       sortable: true,
       filterable: true,
       sortKey: (row) => row.personalInfo.nationality,
     },
     {
       id: 'email',
       header: 'Email',
       accessor: (row) => row.personalInfo.contact?.email,
       cell: (value) => value || '—',
     },
     {
       id: 'phone',
       header: 'Phone',
       accessor: (row) => row.personalInfo.contact?.phone,
       cell: (value) => value || '—',
     },
     {
       id: 'vessel',
       header: 'Current Vessel',
       accessor: (row) => row.employment.currentVesselName,
       cell: (value) => value || 'Not Assigned',
     },
     {
       id: 'joinedDate',
       header: 'Joined Date',
       accessor: (row) => row.employment.joinedDate,
       sortable: true,
       sortKey: (row) => row.employment.joinedDate,
       cell: (value) => value ? new Date(value).toLocaleDateString() : '—',
     },
     {
       id: 'contractEnd',
       header: 'Contract End',
       accessor: (row) => row.employment.contractEndDate,
       sortable: true,
       sortKey: (row) => row.employment.contractEndDate,
       cell: (value) => value ? new Date(value).toLocaleDateString() : '—',
     },
     {
       id: 'actions',
       header: 'Actions',
       cell: (_, row) => (
         <DropdownMenu>
           <DropdownMenuTrigger asChild>
             <Button variant="ghost" size="sm">
               <MoreHorizontal className="w-4 h-4" />
             </Button>
           </DropdownMenuTrigger>
           <DropdownMenuContent align="end">
             <DropdownMenuItem onClick={() => navigate(ROUTES.PERSONNEL.DETAILS(row.id!))}>
               <FileText className="w-4 h-4 mr-2" />
               View Profile
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => {
               setSelectedSeafarer(row);
               setShowEditDialog(true);
             }}>
               <Edit className="w-4 h-4 mr-2" />
               Edit Details
             </DropdownMenuItem>
             <DropdownMenuItem onClick={() => {
               setSelectedSeafarer(row);
               setShowAssignDialog(true);
             }}>
               <Ship className="w-4 h-4 mr-2" />
               Assign to Vessel
             </DropdownMenuItem>
             <DropdownMenuItem
               className="text-destructive"
               onClick={() => {
                 if (confirm('Are you sure you want to delete this seafarer?')) {
                   handleDeleteSeafarer(row.id!);
                 }
               }}
             >
               <Trash2 className="w-4 h-4 mr-2" />
               Delete
             </DropdownMenuItem>
           </DropdownMenuContent>
         </DropdownMenu>
       ),
     },
   ];

  useEffect(() => {
    const loadData = async () => {
      if (!selectedCompany) return;

      try {
        await db.init();
        const [allSeafarers, allVessels] = await Promise.all([
          db.getSeafarersByCompany(selectedCompany.id),
          db.getByIndex(STORE_NAMES.VESSELS, 'by_company', selectedCompany.id)
        ]);
        setSeafarers(allSeafarers);
        setVessels(allVessels);

        // Check for expiring documents after loading
        setTimeout(() => checkExpiringDocuments(), 1000);
      } catch (error) {
        console.error('Failed to load data:', error);
        toast({
          title: "Error",
          description: "Failed to load data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedCompany, toast]);

  const handleAddSeafarer = async (seafarerData: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (!selectedCompany || !user) return;

    try {
      const now = new Date().toISOString();
      const newSeafarer = await db.createSeafarer({
        ...seafarerData,
      });

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
      const updatedSeafarer = await db.update<Seafarer>(STORE_NAMES.SEAFARERS, selectedSeafarer.id!, seafarerData as Partial<Seafarer>);
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
      await db.delete(STORE_NAMES.SEAFARERS, seafarerId);
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

  const handleExportSeafarers = () => {
    try {
      const exportData = seafarers.map((seafarer: Seafarer) => ({
        'First Name': seafarer.personalInfo.firstName,
        'Last Name': seafarer.personalInfo.lastName,
        'Email': seafarer.personalInfo.contact?.email || '',
        'Phone': seafarer.personalInfo.contact?.phone || '',
        'Nationality': seafarer.personalInfo.nationality,
        'Rank': seafarer.employment.rank,
        'Status': seafarer.employment.status,
        'Base Wage': seafarer.employment.baseWage,
        'Currency': seafarer.employment.wageCurrency,
        'Joined Date': seafarer.employment.joinedDate,
        'Contract End Date': seafarer.employment.contractEndDate || '',
        'Current Vessel': seafarer.employment.currentVesselName || ''
      }));

      exportToCSV(exportData, undefined, `seafarers_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported ${seafarers.length} seafarers to CSV`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export seafarers data",
        variant: "destructive"
      });
    }
  };

  const handleAssignToVessel = async (seafarerId: string, vesselName: string) => {
    try {
      const existing = seafarers.find(s => s.id === seafarerId);
      await db.update<Seafarer>(STORE_NAMES.SEAFARERS, seafarerId, {
        employment: {
          ...(existing?.employment || {}),
          currentVesselName: vesselName,
          status: 'onboard'
        }
      } as Partial<Seafarer>);

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

  // Check for expiring documents and create notifications
  const checkExpiringDocuments = async () => {
    if (!selectedCompany || !user) return;

    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    for (const seafarer of seafarers) {
      // Check documents
      seafarer.documents.forEach(doc => {
        if (doc.expiryDate) {
          const expiryDate = new Date(doc.expiryDate);
          if (expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
            // Create notification
            const notification = {
              type: 'warning' as const,
              title: 'Document Expiring Soon',
              message: `${doc.type} for ${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName} expires on ${expiryDate.toLocaleDateString()}`,
              read: false,
              actionUrl: `/personnel/${seafarer.id}`,
              actionLabel: 'View Seafarer',
              metadata: { seafarerId: seafarer.id, documentType: doc.type },
              scheduledAt: now.toISOString(),
              expiresAt: expiryDate.toISOString(),
            };

            // Check if notification already exists
            // TODO: Implement notification system
          }
        }
      });

      // Check trainings
      seafarer.trainings.forEach(training => {
        if (training.expiryDate) {
          const expiryDate = new Date(training.expiryDate);
          if (expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
            const notification = {
              type: 'warning' as const,
              title: 'Certificate Expiring Soon',
              message: `${training.course} certificate for ${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName} expires on ${expiryDate.toLocaleDateString()}`,
              read: false,
              actionUrl: `/personnel/${seafarer.id}`,
              actionLabel: 'View Seafarer',
              metadata: { seafarerId: seafarer.id, trainingId: training.course },
              scheduledAt: now.toISOString(),
              expiresAt: expiryDate.toISOString(),
            };
          }
        }
      });

      // Check medicals
      seafarer.medicals.forEach(medical => {
        if (medical.expiryDate) {
          const expiryDate = new Date(medical.expiryDate);
          if (expiryDate <= thirtyDaysFromNow && expiryDate >= now) {
            const notification = {
              type: 'warning' as const,
              title: 'Medical Certificate Expiring Soon',
              message: `${medical.type} certificate for ${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName} expires on ${expiryDate.toLocaleDateString()}`,
              read: false,
              actionUrl: `/personnel/${seafarer.id}`,
              actionLabel: 'View Seafarer',
              metadata: { seafarerId: seafarer.id, medicalType: medical.type },
              scheduledAt: now.toISOString(),
              expiresAt: expiryDate.toISOString(),
            };
          }
        }
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'onboard': return 'bg-primary text-primary-foreground';
      case 'on_leave': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading personnel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Personnel Management</h1>
            <p className="text-muted-foreground">Manage your seafarer database</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportSeafarers}>
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
                <SeafarerForm onSubmit={handleAddSeafarer} onCancel={() => setShowAddDialog(false)} />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Personnel Table */}
        <DataTable
          data={seafarers}
          columns={seafarerColumns}
          loading={loading}
          emptyMessage="No seafarers found. Start by adding your first seafarer to the system."
          pageSize={10}
          searchable
          searchPlaceholder="Search seafarers by name, email, rank..."
          filterable
          sortable
          onRowClick={(seafarer) => navigate(ROUTES.PERSONNEL.DETAILS(seafarer.id!))}
        />

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

        {/* Assign to Vessel Dialog */}
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Assign to Vessel</DialogTitle>
              <DialogDescription>
                Select a vessel to assign {selectedSeafarer?.personalInfo.firstName} {selectedSeafarer?.personalInfo.lastName} to
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="vessel">Select Vessel</Label>
                <Select value={selectedVessel} onValueChange={setSelectedVessel}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a vessel" />
                  </SelectTrigger>
                  <SelectContent>
                    {vessels.map((vessel) => (
                      <SelectItem key={vessel.id} value={vessel.name}>
                        {vessel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (selectedSeafarer && selectedVessel) {
                    handleAssignToVessel(selectedSeafarer.id!, selectedVessel);
                    setShowAssignDialog(false);
                    setSelectedVessel('');
                  }
                }}
                disabled={!selectedVessel}
              >
                Assign
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

 // Seafarer Form Component
function SeafarerForm({
  initialData,
  onSubmit,
  onCancel
}: {
  initialData?: Seafarer;
  onSubmit: (data: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel?: () => void;
}) {
  const [activeTab, setActiveTab] = useState('personal');
  const [formData, setFormData] = useState<any>({
    personalInfo: {
      firstName: initialData?.personalInfo.firstName || '',
      lastName: initialData?.personalInfo.lastName || '',
      dateOfBirth: initialData?.personalInfo.dateOfBirth || '',
      placeOfBirth: initialData?.personalInfo.placeOfBirth || '',
      nationality: initialData?.personalInfo.nationality || '',
      maritalStatus: initialData?.personalInfo.maritalStatus || 'single',
      address: {
        street: initialData?.personalInfo.address?.street || '',
        city: initialData?.personalInfo.address?.city || '',
        state: initialData?.personalInfo.address?.state || '',
        postalCode: initialData?.personalInfo.address?.postalCode || '',
        country: initialData?.personalInfo.address?.country || '',
      },
      contact: {
        email: initialData?.personalInfo.contact?.email || '',
        phone: initialData?.personalInfo.contact?.phone || '',
        emergencyContact: {
          name: initialData?.personalInfo.contact?.emergencyContact?.name || '',
          relationship: initialData?.personalInfo.contact?.emergencyContact?.relationship || '',
          phone: initialData?.personalInfo.contact?.emergencyContact?.phone || '',
          email: initialData?.personalInfo.contact?.emergencyContact?.email || '',
        },
      },
    },
    employment: {
      rank: initialData?.employment.rank || '',
      department: initialData?.employment.department || 'deck',
      status: initialData?.employment.status || 'on_leave',
      currentVesselId: initialData?.employment.currentVesselId || '',
      currentVesselName: initialData?.employment.currentVesselName || '',
      signOnDate: initialData?.employment.signOnDate || '',
      contractEndDate: initialData?.employment.contractEndDate || '',
      baseWage: initialData?.employment.baseWage || 0,
      wageCurrency: initialData?.employment.wageCurrency || 'USD',
      workHoursPerWeek: initialData?.employment.workHoursPerWeek || 48,
      leaveDaysPerYear: initialData?.employment.leaveDaysPerYear || 30,
      employmentType: initialData?.employment.employmentType || 'permanent',
      employmentStatus: initialData?.employment.employmentStatus || 'active',
      joinedDate: initialData?.employment.joinedDate || new Date().toISOString().split('T')[0],
      notes: initialData?.employment.notes || '',
    },
    documents: initialData?.documents || [],
    trainings: initialData?.trainings || [],
    medicals: initialData?.medicals || [],
    skills: initialData?.skills || [],
    languages: initialData?.languages || [],
    notes: initialData?.notes || '',
  });

  const ranks = [
    'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
    'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
    'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Cook', 'Steward'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const seafarerData: Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt'> = {
      companyId: '', // Will be set by parent
      personalInfo: formData.personalInfo,
      employment: formData.employment,
      documents: formData.documents,
      trainings: formData.trainings,
      medicals: formData.medicals,
      skills: formData.skills,
      languages: formData.languages,
      notes: formData.notes,
      payrolls: undefined,
      emergencyContacts: []
    };
    onSubmit(seafarerData);
  };

  const addDocument = () => {
    setFormData((prev: { documents: any; }) => ({
      ...prev,
      documents: [...prev.documents, {
        type: 'passport',
        number: '',
        issueDate: '',
        expiryDate: '',
        issuedBy: '',
        notes: '',
      }]
    }));
  };

  const updateDocument = (index: number, field: string, value: any) => {
    setFormData((prev: { documents: any[]; }) => ({
      ...prev,
      documents: prev.documents.map((doc: any, i: number) =>
        i === index ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const removeDocument = (index: number) => {
    setFormData((prev: { documents: any[]; }) => ({
      ...prev,
      documents: prev.documents.filter((_: any, i: number) => i !== index)
    }));
  };

  const addTraining = () => {
    setFormData((prev: { trainings: any; }) => ({
      ...prev,
      trainings: [...prev.trainings, {
        course: '',
        institution: '',
        completionDate: '',
        expiryDate: '',
        certificateNumber: '',
        notes: '',
      }]
    }));
  };

  const updateTraining = (index: number, field: string, value: any) => {
    setFormData((prev: { trainings: any[]; }) => ({
      ...prev,
      trainings: prev.trainings.map((training: any, i: number) =>
        i === index ? { ...training, [field]: value } : training
      )
    }));
  };

  const removeTraining = (index: number) => {
    setFormData((prev: { trainings: any[]; }) => ({
      ...prev,
      trainings: prev.trainings.filter((_: any, i: number) => i !== index)
    }));
  };

  const addMedical = () => {
    setFormData((prev: { medicals: any; }) => ({
      ...prev,
      medicals: [...prev.medicals, {
        type: 'medical',
        examinationDate: '',
        expiryDate: '',
        doctorName: '',
        clinicName: '',
        isFit: true,
        notes: '',
      }]
    }));
  };

  const updateMedical = (index: number, field: string, value: any) => {
    setFormData((prev: { medicals: any[]; }) => ({
      ...prev,
      medicals: prev.medicals.map((medical: any, i: number) =>
        i === index ? { ...medical, [field]: value } : medical
      )
    }));
  };

  const removeMedical = (index: number) => {
    setFormData((prev: { medicals: any[]; }) => ({
      ...prev,
      medicals: prev.medicals.filter((_: any, i: number) => i !== index)
    }));
  };

  const addSkill = () => {
    setFormData((prev: { skills: any; }) => ({
      ...prev,
      skills: [...prev.skills, '']
    }));
  };

  const updateSkill = (index: number, value: string) => {
    setFormData((prev: { skills: any[]; }) => ({
      ...prev,
      skills: prev.skills.map((skill: any, i: number) => i === index ? value : skill)
    }));
  };

  const removeSkill = (index: number) => {
    setFormData((prev: { skills: any[]; }) => ({
      ...prev,
      skills: prev.skills.filter((_: any, i: number) => i !== index)
    }));
  };

  const addLanguage = () => {
    setFormData((prev: { languages: any; }) => ({
      ...prev,
      languages: [...prev.languages, { language: '', proficiency: 'basic' }]
    }));
  };

  const updateLanguage = (index: number, field: string, value: any) => {
    setFormData((prev: { languages: any[]; }) => ({
      ...prev,
      languages: prev.languages.map((lang: any, i: number) =>
        i === index ? { ...lang, [field]: value } : lang
      )
    }));
  };

  const removeLanguage = (index: number) => {
    setFormData((prev: { languages: any[]; }) => ({
      ...prev,
      languages: prev.languages.filter((_: any, i: number) => i !== index)
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name *</Label>
              <Input
                id="firstName"
                value={formData.personalInfo.firstName}
                onChange={(e) => setFormData((prev: any) => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, firstName: e.target.value }
                }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                value={formData.personalInfo.lastName}
                onChange={(e) => setFormData((prev: { personalInfo: any; }) => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, lastName: e.target.value }
                }))}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => setFormData((prev: { personalInfo: any; }) => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="nationality">Nationality</Label>
              <Input
                id="nationality"
                value={formData.personalInfo.nationality}
                onChange={(e) => setFormData((prev: { personalInfo: any; }) => ({
                  ...prev,
                  personalInfo: { ...prev.personalInfo, nationality: e.target.value }
                }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.personalInfo.contact.email}
                onChange={(e) => setFormData((prev: { personalInfo: { contact: any; }; }) => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    contact: { ...prev.personalInfo.contact, email: e.target.value }
                  }
                }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.personalInfo.contact.phone}
                onChange={(e) => setFormData((prev: { personalInfo: { contact: any; }; }) => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    contact: { ...prev.personalInfo.contact, phone: e.target.value }
                  }
                }))}
              />
            </div>
          </div>

          <div>
            <Label>Emergency Contact</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <Input
                placeholder="Name"
                value={formData.personalInfo.contact.emergencyContact.name}
                onChange={(e) => setFormData((prev: { personalInfo: { contact: { emergencyContact: any; }; }; }) => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    contact: {
                      ...prev.personalInfo.contact,
                      emergencyContact: { ...prev.personalInfo.contact.emergencyContact, name: e.target.value }
                    }
                  }
                }))}
              />
              <Input
                placeholder="Relationship"
                value={formData.personalInfo.contact.emergencyContact.relationship}
                onChange={(e) => setFormData((prev: { personalInfo: { contact: { emergencyContact: any; }; }; }) => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    contact: {
                      ...prev.personalInfo.contact,
                      emergencyContact: { ...prev.personalInfo.contact.emergencyContact, relationship: e.target.value }
                    }
                  }
                }))}
              />
              <Input
                placeholder="Phone"
                value={formData.personalInfo.contact.emergencyContact.phone}
                onChange={(e) => setFormData((prev: { personalInfo: { contact: { emergencyContact: any; }; }; }) => ({
                  ...prev,
                  personalInfo: {
                    ...prev.personalInfo,
                    contact: {
                      ...prev.personalInfo.contact,
                      emergencyContact: { ...prev.personalInfo.contact.emergencyContact, phone: e.target.value }
                    }
                  }
                }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="employment" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rank">Rank *</Label>
              <Select
                value={formData.employment.rank}
                onValueChange={(value) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, rank: value }
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
              <Label htmlFor="department">Department</Label>
              <Select
                value={formData.employment.department}
                onValueChange={(value) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, department: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deck">Deck</SelectItem>
                  <SelectItem value="engine">Engine</SelectItem>
                  <SelectItem value="catering">Catering</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.employment.status}
                onValueChange={(value) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, status: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="onboard">Onboard</SelectItem>
                  <SelectItem value="on_leave">On Leave</SelectItem>
                  <SelectItem value="on_training">On Training</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="employmentStatus">Employment Status</Label>
              <Select
                value={formData.employment.employmentStatus}
                onValueChange={(value) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, employmentStatus: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="baseWage">Base Wage</Label>
              <Input
                id="baseWage"
                type="number"
                value={formData.employment.baseWage}
                onChange={(e) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, baseWage: Number(e.target.value) }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Select
                value={formData.employment.wageCurrency}
                onValueChange={(value) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, wageCurrency: value }
                }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="PHP">PHP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="joinedDate">Joined Date</Label>
              <Input
                id="joinedDate"
                type="date"
                value={formData.employment.joinedDate}
                onChange={(e) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, joinedDate: e.target.value }
                }))}
              />
            </div>
            <div>
              <Label htmlFor="contractEndDate">Contract End Date</Label>
              <Input
                id="contractEndDate"
                type="date"
                value={formData.employment.contractEndDate}
                onChange={(e) => setFormData((prev: { employment: any; }) => ({
                  ...prev,
                  employment: { ...prev.employment, contractEndDate: e.target.value }
                }))}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Documents</h3>
            <Button type="button" variant="outline" size="sm" onClick={addDocument}>
              <Plus className="w-4 h-4 mr-2" />
              Add Document
            </Button>
          </div>

          {formData.documents.map((doc: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={doc.type}
                      onValueChange={(value) => updateDocument(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passport">Passport</SelectItem>
                        <SelectItem value="seaman_book">Seaman Book</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="visa">Visa</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Number</Label>
                    <Input
                      value={doc.number}
                      onChange={(e) => updateDocument(index, 'number', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Issue Date</Label>
                    <Input
                      type="date"
                      value={doc.issueDate}
                      onChange={(e) => updateDocument(index, 'issueDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={doc.expiryDate}
                      onChange={(e) => updateDocument(index, 'expiryDate', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Issued By</Label>
                    <Input
                      value={doc.issuedBy}
                      onChange={(e) => updateDocument(index, 'issuedBy', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Document File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // In a real app, you'd upload to a server and get back a URL
                          // For now, we'll store the file name
                          updateDocument(index, 'fileUrl', file.name);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeDocument(index)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="training" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Training & Certifications</h3>
            <Button type="button" variant="outline" size="sm" onClick={addTraining}>
              <Plus className="w-4 h-4 mr-2" />
              Add Training
            </Button>
          </div>

          {formData.trainings.map((training: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Course</Label>
                    <Input
                      value={training.course}
                      onChange={(e) => updateTraining(index, 'course', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Institution</Label>
                    <Input
                      value={training.institution}
                      onChange={(e) => updateTraining(index, 'institution', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Completion Date</Label>
                    <Input
                      type="date"
                      value={training.completionDate}
                      onChange={(e) => updateTraining(index, 'completionDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={training.expiryDate}
                      onChange={(e) => updateTraining(index, 'expiryDate', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Certificate Number</Label>
                    <Input
                      value={training.certificateNumber}
                      onChange={(e) => updateTraining(index, 'certificateNumber', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Certificate File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          updateTraining(index, 'fileUrl', file.name);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeTraining(index)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Medical Records</h3>
            <Button type="button" variant="outline" size="sm" onClick={addMedical}>
              <Plus className="w-4 h-4 mr-2" />
              Add Medical Record
            </Button>
          </div>

          {formData.medicals.map((medical: any, index: number) => (
            <Card key={index}>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type</Label>
                    <Select
                      value={medical.type}
                      onValueChange={(value) => updateMedical(index, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="medical">Medical</SelectItem>
                        <SelectItem value="dental">Dental</SelectItem>
                        <SelectItem value="vaccination">Vaccination</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Examination Date</Label>
                    <Input
                      type="date"
                      value={medical.examinationDate}
                      onChange={(e) => updateMedical(index, 'examinationDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Expiry Date</Label>
                    <Input
                      type="date"
                      value={medical.expiryDate}
                      onChange={(e) => updateMedical(index, 'expiryDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Fit to Work</Label>
                    <Select
                      value={medical.isFit ? 'yes' : 'no'}
                      onValueChange={(value) => updateMedical(index, 'isFit', value === 'yes')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Doctor Name</Label>
                    <Input
                      value={medical.doctorName}
                      onChange={(e) => updateMedical(index, 'doctorName', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Clinic Name</Label>
                    <Input
                      value={medical.clinicName}
                      onChange={(e) => updateMedical(index, 'clinicName', e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Medical File</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          updateMedical(index, 'fileUrl', file.name);
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeMedical(index)}>
                    Remove
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Skills & Languages</h3>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={addSkill}>
                <Plus className="w-4 h-4 mr-2" />
                Add Skill
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={addLanguage}>
                <Plus className="w-4 h-4 mr-2" />
                Add Language
              </Button>
            </div>
          </div>

          <div>
            <Label>Skills</Label>
            {formData.skills.map((skill: string, index: number) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  value={skill}
                  onChange={(e) => updateSkill(index, e.target.value)}
                  placeholder="Enter skill"
                />
                <Button type="button" variant="destructive" size="sm" onClick={() => removeSkill(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label>Languages</Label>
            {formData.languages.map((lang: any, index: number) => (
              <div key={index} className="flex gap-2 mt-2">
                <Input
                  value={lang.language}
                  onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                  placeholder="Language"
                />
                <Select
                  value={lang.proficiency}
                  onValueChange={(value) => updateLanguage(index, 'proficiency', value)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="fluent">Fluent</SelectItem>
                    <SelectItem value="native">Native</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="destructive" size="sm" onClick={() => removeLanguage(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
            />
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 pt-4">
        <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" className="flex-1 ocean-gradient">
          {initialData ? 'Update' : 'Add'} Seafarer
        </Button>
      </div>
    </form>
  );
}