import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Applicant, Seafarer, JobPosting } from '@/lib/schemas';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas';

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
import { DataTable, ColumnConfig } from '@/components/ui/data-table';
import {
  Search,
  Plus,
  UserPlus,
  Download,
  Mail,
  FileText,
  Users,
  Briefcase,
  CheckCircle,
  XCircle,
  Clock,
  Star,
} from 'lucide-react';
import { exportToCSV } from '@/lib/utils/exportUtils';


export default function Recruitment() {
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [jobPostings, setJobPostings] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    const loadRecruitmentData = async () => {
      if (!selectedCompany) return;

      try {
        await db.init();
        const items = await db.getApplicantsByCompany(selectedCompany.id);
        setApplicants(items);

        // Load job postings from database
        const companyJobPostings = await db.getByIndex<JobPosting>(
          STORE_NAMES.JOB_POSTINGS,
          INDEX_NAMES.JOB_POSTING_BY_COMPANY,
          selectedCompany.id
        );
        setJobPostings(companyJobPostings || []);
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

  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [showJobPostingDialog, setShowJobPostingDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactApplicant, setContactApplicant] = useState<Applicant | null>(null);
  const [jobPostingForm, setJobPostingForm] = useState({
    title: '',
    position: '',
    description: '',
    requirements: ''
  });
  const [contactForm, setContactForm] = useState({
    template: 'interview_invitation',
    subject: '',
    message: '',
    sendCopy: false
  });
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const positions = ['Captain', 'Chief Engineer', 'Second Officer', 'Third Officer', 'Cook', 'AB Seaman', 'Oiler'];

  const emailTemplates = {
    interview_invitation: {
      subject: 'Interview Invitation - {position} Position',
      message: `Dear {firstName} {lastName},

We are pleased to invite you for an interview for the position of {position} with Ocean Stride Maritime.

Your application has been reviewed and we believe you would be a great fit for our team. We would like to discuss your experience and qualifications in more detail.

Interview Details:
- Date: [Please specify date and time]
- Location: [Virtual/In-person location]
- Contact: recruitment@oceanstride.com

Please confirm your availability by replying to this email or calling us at +1 (555) 123-4567.

We look forward to speaking with you soon.

Best regards,
Recruitment Team
Ocean Stride Maritime`
    },
    application_acknowledgment: {
      subject: 'Application Received - {position} Position',
      message: `Dear {firstName} {lastName},

Thank you for your interest in the {position} position at Ocean Stride Maritime.

We have received your application and our recruitment team will review it carefully. This process typically takes 5-7 business days.

If your qualifications match our requirements, we will contact you to schedule an interview.

Thank you for considering Ocean Stride Maritime as your next career opportunity.

Best regards,
Recruitment Team
Ocean Stride Maritime`
    },
    rejection: {
      subject: 'Update on Your Application - {position} Position',
      message: `Dear {firstName} {lastName},

Thank you for your interest in the {position} position at Ocean Stride Maritime and for taking the time to submit your application.

After careful consideration, we have decided to pursue other candidates whose qualifications more closely match our current requirements.

We appreciate your interest in Ocean Stride Maritime and encourage you to apply for future opportunities that align with your skills and experience.

We wish you the best in your job search.

Best regards,
Recruitment Team
Ocean Stride Maritime`
    },
    offer_followup: {
      subject: 'Follow-up on Job Offer - {position} Position',
      message: `Dear {firstName} {lastName},

We hope this email finds you well. We wanted to follow up on the job offer we extended to you for the {position} position.

We are excited about the possibility of you joining our team and would like to answer any questions you may have about the position, compensation, or onboarding process.

Please let us know if you need any additional information or if you have any concerns.

We look forward to your response.

Best regards,
Recruitment Team
Ocean Stride Maritime`
    }
  };

  const applicationColumns: ColumnConfig<Applicant>[] = [
    {
      id: 'candidate',
      header: 'Candidate',
      accessor: (row) => `${row.personalInfo.firstName} ${row.personalInfo.lastName}`,
      sortable: true,
      cell: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.personalInfo.email}</div>
        </div>
      ),
    },
    {
      id: 'position',
      header: 'Position',
      accessor: (row) => row.application.position,
      sortable: true,
      filterable: true,
    },
    {
      id: 'experience',
      header: 'Experience',
      accessor: (row) => row.application.experience,
      sortable: true,
      cell: (value) => `${value} years`,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.application.status,
      sortable: true,
      filterable: true,
      cell: (value) => getStatusBadge(value),
    },
    {
      id: 'priority',
      header: 'Priority',
      accessor: (row) => row.application.priority,
      sortable: true,
      cell: (value) => <Star className={`w-4 h-4 ${getPriorityColor(value)}`} />,
    },
    {
      id: 'appliedDate',
      header: 'Applied Date',
      accessor: (row) => row.application.appliedDate,
      sortable: true,
      cell: (value) => new Date(value).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedApplicant(row)}
          >
            <FileText className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleContactApplicant(row)}
          >
            <Mail className="w-4 h-4 mr-1" />
            Contact
          </Button>
          {row.application.status === 'reviewing' && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleScheduleInterview(row.id)}
              >
                Interview
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="ocean-gradient"
                onClick={() => handleApproveApplicant(row.id)}
              >
                Approve
              </Button>
            </>
          )}
          {row.application.status === 'interview' && (
            <Button
              variant="outline"
              size="sm"
              className="ocean-gradient"
              onClick={() => handleApproveApplicant(row.id)}
            >
              Hire
            </Button>
          )}
        </div>
      ),
    },
  ];

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

  // Reject handler can be added when wired to the UI

  const handleScheduleInterview = (applicantId: string) => {
    handleStatusChange(applicantId, 'interview');
  };

  const handleCreateJobPosting = async () => {
    if (!jobPostingForm.title || !jobPostingForm.position || !jobPostingForm.description || !jobPostingForm.requirements) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const jobPostingData: Omit<JobPosting, 'id' | 'createdAt' | 'updatedAt'> = {
        title: jobPostingForm.title,
        position: jobPostingForm.position,
        description: jobPostingForm.description,
        requirements: jobPostingForm.requirements,
        status: 'open',
        postedDate: new Date().toISOString().split('T')[0],
        applicationsCount: 0,
        companyId: selectedCompany?.id
      };

      await db.add<JobPosting>(STORE_NAMES.JOB_POSTINGS, jobPostingData);

      setJobPostingForm({ title: '', position: '', description: '', requirements: '' });
      setShowJobPostingDialog(false);

      // Refresh job postings
      const companyJobPostings = await db.getByIndex<JobPosting>(
        STORE_NAMES.JOB_POSTINGS,
        INDEX_NAMES.JOB_POSTING_BY_COMPANY,
        selectedCompany!.id
      );
      setJobPostings(companyJobPostings || []);

      toast({
        title: "Job Posting Created",
        description: `Job posting for ${jobPostingForm.position} has been created and saved`
      });
    } catch (error) {
      console.error('Failed to create job posting:', error);
      toast({
        title: "Error",
        description: "Failed to create job posting. Please try again.",
        variant: "destructive"
      });
    }
  };

  const generateOfferLetter = (applicant: Applicant) => {
    const offerLetter = `
OFFER LETTER

Date: ${new Date().toLocaleDateString()}

${applicant.personalInfo.firstName} ${applicant.personalInfo.lastName}
${applicant.personalInfo.email}

Dear ${applicant.personalInfo.firstName},

We are pleased to offer you the position of ${applicant.application.position} with our company.

Position Details:
- Position: ${applicant.application.position}
- Start Date: To be confirmed
- Salary: Competitive package based on experience
- Location: Vessel assignment

Terms and Conditions:
- This is a permanent position subject to satisfactory completion of probation period
- All standard company policies and procedures apply
- Medical examination and STCW certification required

Please confirm your acceptance by signing and returning this letter within 7 days.

We look forward to welcoming you to our team.

Best regards,
Recruitment Team
Ocean Stride Maritime
    `.trim();

    const blob = new Blob([offerLetter], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `offer_letter_${applicant.personalInfo.firstName}_${applicant.personalInfo.lastName}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Offer Letter Generated",
      description: `Offer letter for ${applicant.personalInfo.firstName} has been downloaded`
    });
  };

  const handleExportRecruitmentData = () => {
    try {
      const exportData = applicants.map(applicant => ({
        'First Name': applicant.personalInfo.firstName,
        'Last Name': applicant.personalInfo.lastName,
        'Email': applicant.personalInfo.email,
        'Phone': applicant.personalInfo.phone,
        'Nationality': applicant.personalInfo.nationality,
        'Position': applicant.application.position,
        'Experience (Years)': applicant.application.experience,
        'Applied Date': applicant.application.appliedDate,
        'Status': applicant.application.status,
        'Priority': applicant.application.priority,
        'Certificates': applicant.qualifications.certificates.join(', '),
        'Languages': '—'
      }));

      exportToCSV(exportData, undefined, `recruitment_data_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported recruitment data for ${applicants.length} applicants`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export recruitment data",
        variant: "destructive"
      });
    }
  };

  const handleContactApplicant = (applicant: Applicant) => {
    setContactApplicant(applicant);
    setContactForm({
      template: 'interview_invitation',
      subject: emailTemplates.interview_invitation.subject
        .replace('{position}', applicant.application.position)
        .replace('{firstName}', applicant.personalInfo.firstName)
        .replace('{lastName}', applicant.personalInfo.lastName),
      message: emailTemplates.interview_invitation.message
        .replace(/{firstName}/g, applicant.personalInfo.firstName)
        .replace(/{lastName}/g, applicant.personalInfo.lastName)
        .replace(/{position}/g, applicant.application.position),
      sendCopy: false
    });
    setShowContactDialog(true);
  };

  const handleTemplateChange = (templateKey: string) => {
    if (!contactApplicant) return;

    const template = emailTemplates[templateKey as keyof typeof emailTemplates];
    setContactForm(prev => ({
      ...prev,
      template: templateKey,
      subject: template.subject
        .replace('{position}', contactApplicant.application.position)
        .replace('{firstName}', contactApplicant.personalInfo.firstName)
        .replace('{lastName}', contactApplicant.personalInfo.lastName),
      message: template.message
        .replace(/{firstName}/g, contactApplicant.personalInfo.firstName)
        .replace(/{lastName}/g, contactApplicant.personalInfo.lastName)
        .replace(/{position}/g, contactApplicant.application.position)
    }));
  };

  const handleSendEmail = async () => {
    if (!contactApplicant || !contactForm.subject || !contactForm.message) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSendingEmail(true);
    try {
      // Log the communication in database
      const communicationLog = {
        id: `comm_${Date.now()}`,
        applicantId: contactApplicant.id,
        type: 'email',
        subject: contactForm.subject,
        message: contactForm.message,
        template: contactForm.template,
        sentAt: new Date().toISOString(),
        sentBy: 'recruitment_officer', // In real app, get from auth context
        companyId: selectedCompany?.id
      };

      // In a real implementation, this would save to a communications store
      const existingLogs = JSON.parse(localStorage.getItem(`comm_logs_${selectedCompany?.id}`) || '[]');
      existingLogs.push(communicationLog);
      localStorage.setItem(`comm_logs_${selectedCompany?.id}`, JSON.stringify(existingLogs));

      // Simulate email sending
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Email Sent",
        description: `Email sent successfully to ${contactApplicant.personalInfo.firstName} ${contactApplicant.personalInfo.lastName}`
      });

      setShowContactDialog(false);
      setContactApplicant(null);
    } catch (error) {
      console.error('Failed to send email:', error);
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSendingEmail(false);
    }
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

  // Removed filteredApplicants - handled by DataTable

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Recruitment</h1>
            <p className="text-muted-foreground">Manage job applications and candidate pipeline</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportRecruitmentData}>
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Dialog open={showJobPostingDialog} onOpenChange={setShowJobPostingDialog}>
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
                    <Label htmlFor="title">Job Title</Label>
                    <Input
                      id="title"
                      value={jobPostingForm.title}
                      onChange={(e) => setJobPostingForm(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="e.g. Captain - MV Atlantic Star"
                    />
                  </div>
                  <div>
                    <Label htmlFor="position">Position</Label>
                    <Select
                      value={jobPostingForm.position}
                      onValueChange={(value) => setJobPostingForm(prev => ({ ...prev, position: value }))}
                    >
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
                    <Textarea
                      id="description"
                      value={jobPostingForm.description}
                      onChange={(e) => setJobPostingForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Enter job requirements and responsibilities..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="requirements">Requirements</Label>
                    <Textarea
                      id="requirements"
                      value={jobPostingForm.requirements}
                      onChange={(e) => setJobPostingForm(prev => ({ ...prev, requirements: e.target.value }))}
                      placeholder="Enter required qualifications and experience..."
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" onClick={() => setShowJobPostingDialog(false)}>Cancel</Button>
                    <Button className="flex-1 ocean-gradient" onClick={handleCreateJobPosting}>Create Posting</Button>
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
            {/* Applications Table */}
            <DataTable
              data={applicants}
              columns={applicationColumns}
              loading={loading}
              emptyMessage="No applications found. Create job postings to attract candidates."
              pageSize={10}
              searchable
              searchPlaceholder="Search applicants..."
              filterable
              sortable
            />
          </TabsContent>

          <TabsContent value="positions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Open Positions</CardTitle>
                <CardDescription>Currently available positions across the fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {jobPostings.filter(job => job.status === 'open').map(job => (
                    <Card key={job.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription>{job.position}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Applications:</span>
                            <span className="font-medium">{job.applicationsCount}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Posted:</span>
                            <span>{new Date(job.postedDate).toLocaleDateString()}</span>
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

                <div className="space-y-4">
                  <div>
                    <Label>Interview Scheduling</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Input type="datetime-local" placeholder="Interview Date & Time" />
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Interview Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="phone">Phone Interview</SelectItem>
                          <SelectItem value="video">Video Interview</SelectItem>
                          <SelectItem value="in_person">In Person</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Candidate Evaluation</Label>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <Label className="text-sm">Experience Rating</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="1-5" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5].map(rating => (
                              <SelectItem key={rating} value={rating.toString()}>{rating} ⭐</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm">Technical Skills</Label>
                        <Select>
                          <SelectTrigger>
                            <SelectValue placeholder="1-5" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1,2,3,4,5].map(rating => (
                              <SelectItem key={rating} value={rating.toString()}>{rating} ⭐</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1">
                      Schedule Interview
                    </Button>
                    <Button variant="destructive" className="flex-1">
                      Reject
                    </Button>
                    <Button
                      className="flex-1 ocean-gradient"
                      onClick={() => {
                        handleApproveApplicant(selectedApplicant!.id);
                        generateOfferLetter(selectedApplicant!);
                      }}
                    >
                      Approve & Send Offer
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Contact Dialog */}
        {contactApplicant && (
          <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Contact {contactApplicant.personalInfo.firstName} {contactApplicant.personalInfo.lastName}</DialogTitle>
                <DialogDescription>
                  Send an email to the applicant regarding their {contactApplicant.application.position} application
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="template">Email Template</Label>
                  <Select value={contactForm.template} onValueChange={handleTemplateChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="interview_invitation">Interview Invitation</SelectItem>
                      <SelectItem value="application_acknowledgment">Application Acknowledgment</SelectItem>
                      <SelectItem value="rejection">Rejection Notice</SelectItem>
                      <SelectItem value="offer_followup">Offer Follow-up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={contactForm.subject}
                    onChange={(e) => setContactForm(prev => ({ ...prev, subject: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={contactForm.message}
                    onChange={(e) => setContactForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={12}
                    className="font-mono text-sm"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="sendCopy"
                    checked={contactForm.sendCopy}
                    onChange={(e) => setContactForm(prev => ({ ...prev, sendCopy: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="sendCopy">Send a copy to my email</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => setShowContactDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 ocean-gradient"
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                  >
                    {isSendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
  );
}