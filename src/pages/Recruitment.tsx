import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  UserPlus, 
  Download, 
  Mail, 
  Phone, 
  FileText, 
  Calendar,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Filter
} from 'lucide-react';

interface Applicant {
  id: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    nationality: string;
    dateOfBirth: string;
  };
  application: {
    position: string;
    experience: number;
    status: 'pending' | 'reviewing' | 'interview' | 'approved' | 'rejected';
    appliedDate: string;
    priority: 'high' | 'medium' | 'low';
  };
  qualifications: {
    rank: string;
    certificates: string[];
    lastVessel: string;
  };
}

export default function Recruitment() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    const loadRecruitmentData = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        
        // Generate sample applicants for demonstration
        const sampleApplicants: Applicant[] = [
          {
            id: '1',
            personalInfo: {
              firstName: 'John',
              lastName: 'Smith',
              email: 'john.smith@email.com',
              phone: '+1-555-0101',
              nationality: 'United States',
              dateOfBirth: '1985-03-15'
            },
            application: {
              position: 'Chief Engineer',
              experience: 8,
              status: 'reviewing',
              appliedDate: '2024-01-15',
              priority: 'high'
            },
            qualifications: {
              rank: 'Chief Engineer',
              certificates: ['STCW III/1', 'Engine Room Resource Management'],
              lastVessel: 'MV Atlantic Star'
            }
          },
          {
            id: '2',
            personalInfo: {
              firstName: 'Maria',
              lastName: 'Garcia',
              email: 'maria.garcia@email.com',
              phone: '+34-666-123456',
              nationality: 'Spain',
              dateOfBirth: '1990-07-22'
            },
            application: {
              position: 'Second Officer',
              experience: 4,
              status: 'interview',
              appliedDate: '2024-01-18',
              priority: 'medium'
            },
            qualifications: {
              rank: 'Second Officer',
              certificates: ['STCW II/1', 'Bridge Resource Management'],
              lastVessel: 'MV Mediterranean'
            }
          },
          {
            id: '3',
            personalInfo: {
              firstName: 'Erik',
              lastName: 'Hansen',
              email: 'erik.hansen@email.com',
              phone: '+47-999-88776',
              nationality: 'Norway',
              dateOfBirth: '1982-11-08'
            },
            application: {
              position: 'Chief Cook',
              experience: 12,
              status: 'approved',
              appliedDate: '2024-01-10',
              priority: 'high'
            },
            qualifications: {
              rank: 'Chief Cook',
              certificates: ['Food Safety', 'Ship Cook Certificate'],
              lastVessel: 'MV Baltic Star'
            }
          }
        ];
        
        setApplicants(sampleApplicants);
      } catch (error) {
        console.error('Failed to load recruitment data:', error);
        toast({
          title: "Error",
          description: "Failed to load recruitment data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadRecruitmentData();
  }, [selectedCompany, toast]);

  const updateApplicantStatus = async (applicantId: string, newStatus: Applicant['application']['status']) => {
    try {
      setApplicants(prev => prev.map(applicant => 
        applicant.id === applicantId 
          ? { ...applicant, application: { ...applicant.application, status: newStatus }}
          : applicant
      ));
      
      const applicant = applicants.find(a => a.id === applicantId);
      toast({
        title: "Status Updated",
        description: `${applicant?.personalInfo.firstName} ${applicant?.personalInfo.lastName}'s status changed to ${newStatus}`
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update status",
        variant: "destructive"
      });
    }
  };

  const handleHireApplicant = async (applicantId: string) => {
    try {
      const applicant = applicants.find(a => a.id === applicantId);
      if (!applicant) return;

      // Convert applicant to seafarer
      const seafarerData = {
        companyId: selectedCompany?.id || '',
        personalInfo: {
          ...applicant.personalInfo,
          passportNumber: `P${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          seamanBook: `SB${Math.random().toString(36).substring(2, 10).toUpperCase()}`
        },
        qualifications: {
          rank: applicant.qualifications.rank,
          certificates: applicant.qualifications.certificates.map(cert => ({
            id: `cert-${Math.random().toString(36).substring(2, 8)}`,
            name: cert,
            number: `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
            issuingAuthority: 'Maritime Authority',
            issuedDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expiryDate: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }))
        },
        employment: {
          status: 'available' as const,
          position: applicant.application.position,
          currentVessel: '',
          contractStart: new Date().toISOString().split('T')[0],
          contractEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        financial: {
          bankName: 'International Bank',
          accountNumber: `****${Math.floor(Math.random() * 9999)}`,
          currency: 'USD',
          basicWage: Math.floor(Math.random() * 3000) + 2000,
          overtimeRate: 25
        }
      };

      await db.createSeafarer(seafarerData);
      
      // Update applicant status to approved
      setApplicants(prev => prev.map(a => 
        a.id === applicantId 
          ? { ...a, application: { ...a.application, status: 'approved' }}
          : a
      ));

      toast({
        title: "Applicant Hired",
        description: `${applicant.personalInfo.firstName} ${applicant.personalInfo.lastName} has been hired and added to personnel`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to hire applicant",
        variant: "destructive"
      });
    }
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [positionFilter, setPositionFilter] = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  
  const positions = ['Captain', 'Chief Engineer', 'Second Officer', 'Third Officer', 'Cook', 'AB Seaman', 'Oiler'];

  const handleStatusChange = (applicantId: string, newStatus: Applicant['application']['status']) => {
    setApplicants(prev => prev.map(app => 
      app.id === applicantId 
        ? { ...app, application: { ...app.application, status: newStatus } }
        : app
    ));
  };

  const handleApproveApplicant = (applicantId: string) => {
    handleStatusChange(applicantId, 'approved');
  };

  const handleRejectApplicant = (applicantId: string) => {
    handleStatusChange(applicantId, 'rejected');
  };

  const handleScheduleInterview = (applicantId: string) => {
    handleStatusChange(applicantId, 'interview');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'interview': return <Users className="w-4 h-4 text-warning" />;
      case 'reviewing': return <Clock className="w-4 h-4 text-info" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'secondary',
      reviewing: 'outline',
      interview: 'default',
      approved: 'default',
      rejected: 'destructive'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-warning';
      case 'low': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const filteredApplicants = applicants.filter(applicant => {
    const matchesSearch = `${applicant.personalInfo.firstName} ${applicant.personalInfo.lastName}`
      .toLowerCase().includes(searchTerm.toLowerCase()) ||
      applicant.application.position.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || applicant.application.status === statusFilter;
    const matchesPosition = positionFilter === 'all' || applicant.application.position === positionFilter;
    
    return matchesSearch && matchesStatus && matchesPosition;
  });

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recruitment</h1>
            <p className="text-muted-foreground">Manage job applications and candidate pipeline</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="ocean-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Job Posting
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Job Posting</DialogTitle>
                  <DialogDescription>
                    Add a new position to attract qualified seafarers
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select position" />
                      </SelectTrigger>
                      <SelectContent>
                        {positions.map(position => (
                          <SelectItem key={position} value={position}>{position}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="description">Job Description</Label>
                    <Textarea placeholder="Enter job requirements and responsibilities..." />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">Cancel</Button>
                    <Button className="flex-1 ocean-gradient">Create Posting</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <UserPlus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">127</div>
              <p className="text-xs text-muted-foreground">+12% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Review</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">23</div>
              <p className="text-xs text-muted-foreground">Awaiting assessment</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Interviews Scheduled</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">8</div>
              <p className="text-xs text-muted-foreground">This week</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hired This Month</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">15</div>
              <p className="text-xs text-muted-foreground">+25% from last month</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="positions">Open Positions</TabsTrigger>
            <TabsTrigger value="pipeline">Recruitment Pipeline</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search applicants..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="reviewing">Reviewing</SelectItem>
                      <SelectItem value="interview">Interview</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {positions.map(position => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Applications Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Applications</CardTitle>
                <CardDescription>
                  Manage and review candidate applications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Candidate</TableHead>
                      <TableHead>Position</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Applied Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplicants.map((applicant) => (
                      <TableRow key={applicant.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">
                              {applicant.personalInfo.firstName} {applicant.personalInfo.lastName}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {applicant.personalInfo.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{applicant.application.position}</TableCell>
                        <TableCell>{applicant.application.experience} years</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(applicant.application.status)}
                            {getStatusBadge(applicant.application.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Star className={`w-4 h-4 ${getPriorityColor(applicant.application.priority)}`} />
                        </TableCell>
                        <TableCell>{new Date(applicant.application.appliedDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedApplicant(applicant)}
                            >
                              <FileText className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Mail className="w-4 h-4 mr-1" />
                              Contact
                            </Button>
                            {applicant.application.status === 'reviewing' && (
                              <>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleScheduleInterview(applicant.id)}
                                >
                                  Interview
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  className="ocean-gradient"
                                  onClick={() => handleApproveApplicant(applicant.id)}
                                >
                                  Approve
                                </Button>
                              </>
                            )}
                            {applicant.application.status === 'interview' && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="ocean-gradient"
                                onClick={() => handleApproveApplicant(applicant.id)}
                              >
                                Hire
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Currently available positions across the fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {['Captain', 'Chief Engineer', 'Second Officer', 'Cook'].map(position => (
                    <Card key={position}>
                      <CardHeader>
                        <CardTitle className="text-lg">{position}</CardTitle>
                        <CardDescription>Multiple vessels</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Applications:</span>
                            <span className="font-medium">12</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Urgency:</span>
                            <Badge variant="destructive">High</Badge>
                          </div>
                          <Button className="w-full mt-4" variant="outline">
                            <Briefcase className="w-4 h-4 mr-2" />
                            Manage Position
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pipeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recruitment Pipeline</CardTitle>
                <CardDescription>Track candidates through the hiring process</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {[
                    { stage: 'Applied', count: 45, color: 'bg-muted' },
                    { stage: 'Screening', count: 23, color: 'bg-info/20' },
                    { stage: 'Interview', count: 8, color: 'bg-warning/20' },
                    { stage: 'Reference', count: 5, color: 'bg-success/20' },
                    { stage: 'Hired', count: 3, color: 'bg-success' }
                  ].map(stage => (
                    <Card key={stage.stage} className={stage.color}>
                      <CardHeader className="text-center">
                        <CardTitle className="text-2xl">{stage.count}</CardTitle>
                        <CardDescription>{stage.stage}</CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Applicant Detail Modal */}
        {selectedApplicant && (
          <Dialog open={!!selectedApplicant} onOpenChange={() => setSelectedApplicant(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {selectedApplicant.personalInfo.firstName} {selectedApplicant.personalInfo.lastName}
                </DialogTitle>
                <DialogDescription>
                  Application for {selectedApplicant.application.position}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <p className="text-sm">{selectedApplicant.personalInfo.email}</p>
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <p className="text-sm">{selectedApplicant.personalInfo.phone}</p>
                  </div>
                  <div>
                    <Label>Nationality</Label>
                    <p className="text-sm">{selectedApplicant.personalInfo.nationality}</p>
                  </div>
                  <div>
                    <Label>Experience</Label>
                    <p className="text-sm">{selectedApplicant.application.experience} years</p>
                  </div>
                </div>
                
                <div>
                  <Label>Certificates</Label>
                  <div className="flex gap-2 mt-1">
                    {selectedApplicant.qualifications.certificates.map(cert => (
                      <Badge key={cert} variant="outline">{cert}</Badge>
                    ))}
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1">
                    Schedule Interview
                  </Button>
                  <Button variant="destructive" className="flex-1">
                    Reject
                  </Button>
                  <Button className="flex-1 ocean-gradient">
                    Approve
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </AppLayout>
  );
}