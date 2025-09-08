import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  Download, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  FileText,
  Award,
  BarChart3,
  Users,
  Ship,
  Plus,
  Bell,
  RefreshCw
} from 'lucide-react';

interface Certificate {
  id: string;
  seafarerId: string;
  seafarerName: string;
  type: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  status: 'valid' | 'expiring' | 'expired';
  daysUntilExpiry: number;
}

interface ComplianceRecord {
  id: string;
  seafarerId: string;
  seafarerName: string;
  vessel: string;
  workHours: {
    thisWeek: number;
    thisMonth: number;
    restViolations: number;
  };
  certificates: Certificate[];
  complianceScore: number;
  lastAudit: string;
}

const mockCertificates: Certificate[] = [
  {
    id: '1',
    seafarerId: '1',
    seafarerName: 'John Smith',
    type: 'STCW Basic Safety Training',
    number: 'BST-2021-001234',
    issueDate: '2021-03-15',
    expiryDate: '2026-03-15',
    issuingAuthority: 'MCA UK',
    status: 'valid',
    daysUntilExpiry: 456
  },
  {
    id: '2',
    seafarerId: '1',
    seafarerName: 'John Smith',
    type: 'Engine Management Level',
    number: 'EML-2020-567890',
    issueDate: '2020-08-22',
    expiryDate: '2025-08-22',
    issuingAuthority: 'MCA UK',
    status: 'expiring',
    daysUntilExpiry: 45
  },
  {
    id: '3',
    seafarerId: '2',
    seafarerName: 'Maria Rodriguez',
    type: 'Officer of the Watch',
    number: 'OOW-2019-345678',
    issueDate: '2019-05-10',
    expiryDate: '2024-05-10',
    issuingAuthority: 'Spanish Maritime Authority',
    status: 'expired',
    daysUntilExpiry: -120
  }
];

const mockComplianceRecords: ComplianceRecord[] = [
  {
    id: '1',
    seafarerId: '1',
    seafarerName: 'John Smith',
    vessel: 'MV Atlantic Star',
    workHours: { thisWeek: 68, thisMonth: 280, restViolations: 0 },
    certificates: mockCertificates.filter(c => c.seafarerId === '1'),
    complianceScore: 95,
    lastAudit: '2024-01-15'
  },
  {
    id: '2',
    seafarerId: '2',
    seafarerName: 'Maria Rodriguez',
    vessel: 'MV Mediterranean',
    workHours: { thisWeek: 72, thisMonth: 290, restViolations: 2 },
    certificates: mockCertificates.filter(c => c.seafarerId === '2'),
    complianceScore: 78,
    lastAudit: '2024-01-10'
  }
];

export default function Compliance() {
  const [certificates, setCertificates] = useState<Certificate[]>(mockCertificates);
  const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>(mockComplianceRecords);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'expiring': return <AlertTriangle className="w-4 h-4 text-warning" />;
      case 'expired': return <XCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      valid: 'default',
      expiring: 'default',
      expired: 'destructive'
    } as const;

    const colors = {
      valid: 'bg-success/20 text-success-foreground',
      expiring: 'bg-warning/20 text-warning-foreground',
      expired: 'bg-destructive/20 text-destructive-foreground'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-warning';
    return 'text-destructive';
  };

  const filteredCertificates = certificates.filter(cert => {
    const matchesSearch = cert.seafarerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.number.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    const matchesType = typeFilter === 'all' || cert.type.includes(typeFilter);
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const expiringCerts = certificates.filter(c => c.status === 'expiring').length;
  const expiredCerts = certificates.filter(c => c.status === 'expired').length;
  const validCerts = certificates.filter(c => c.status === 'valid').length;
  const avgComplianceScore = Math.round(complianceRecords.reduce((sum, r) => sum + r.complianceScore, 0) / complianceRecords.length);

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Compliance Management</h1>
            <p className="text-muted-foreground">Certificate tracking and regulatory compliance monitoring</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Compliance Report
            </Button>
            <Button variant="outline">
              <Bell className="w-4 h-4 mr-2" />
              Setup Alerts
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="ocean-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certificate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Certificate</DialogTitle>
                  <DialogDescription>
                    Register a new certificate for a seafarer
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select seafarer" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="john">John Smith</SelectItem>
                      <SelectItem value="maria">Maria Rodriguez</SelectItem>
                      <SelectItem value="erik">Erik Olsen</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stcw">STCW Basic Safety Training</SelectItem>
                      <SelectItem value="medical">Medical Certificate</SelectItem>
                      <SelectItem value="watch">Officer of the Watch</SelectItem>
                      <SelectItem value="engine">Engine Management</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input placeholder="Certificate number" />
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="date" placeholder="Issue date" />
                    <Input type="date" placeholder="Expiry date" />
                  </div>
                  <Input placeholder="Issuing authority" />
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">Cancel</Button>
                    <Button className="flex-1 ocean-gradient">Add Certificate</Button>
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
              <CardTitle className="text-sm font-medium">Compliance Score</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getComplianceColor(avgComplianceScore)}`}>
                {avgComplianceScore}%
              </div>
              <Progress value={avgComplianceScore} className="mt-2" />
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{expiringCerts}</div>
              <p className="text-xs text-muted-foreground">Within 60 days</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Certificates</CardTitle>
              <XCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{expiredCerts}</div>
              <p className="text-xs text-muted-foreground">Require immediate action</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid Certificates</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{validCerts}</div>
              <p className="text-xs text-muted-foreground">Currently compliant</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="certificates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
            <TabsTrigger value="workhours">Work/Rest Hours</TabsTrigger>
            <TabsTrigger value="audits">Audits & Inspections</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
          </TabsList>

          <TabsContent value="certificates" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search certificates, seafarers, or numbers..."
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
                      <SelectItem value="valid">Valid</SelectItem>
                      <SelectItem value="expiring">Expiring</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="STCW">STCW Certificates</SelectItem>
                      <SelectItem value="Medical">Medical Certificates</SelectItem>
                      <SelectItem value="Officer">Officer Certificates</SelectItem>
                      <SelectItem value="Engine">Engine Certificates</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Certificates Table */}
            <Card>
              <CardHeader>
                <CardTitle>Certificate Registry</CardTitle>
                <CardDescription>
                  All seafarer certificates and their expiry status
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seafarer</TableHead>
                      <TableHead>Certificate Type</TableHead>
                      <TableHead>Number</TableHead>
                      <TableHead>Issuing Authority</TableHead>
                      <TableHead>Issue Date</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCertificates.map((cert) => (
                      <TableRow key={cert.id}>
                        <TableCell className="font-medium">{cert.seafarerName}</TableCell>
                        <TableCell>{cert.type}</TableCell>
                        <TableCell className="font-mono text-sm">{cert.number}</TableCell>
                        <TableCell>{cert.issuingAuthority}</TableCell>
                        <TableCell>{new Date(cert.issueDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div>
                            <div>{new Date(cert.expiryDate).toLocaleDateString()}</div>
                            {cert.status === 'expiring' && (
                              <div className="text-xs text-warning">
                                {cert.daysUntilExpiry} days left
                              </div>
                            )}
                            {cert.status === 'expired' && (
                              <div className="text-xs text-destructive">
                                {Math.abs(cert.daysUntilExpiry)} days overdue
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(cert.status)}
                            {getStatusBadge(cert.status)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              View
                            </Button>
                            {cert.status === 'expiring' && (
                              <Button variant="outline" size="sm" className="ocean-gradient">
                                <RefreshCw className="w-4 h-4 mr-1" />
                                Renew
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

          <TabsContent value="workhours" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Work/Rest Hours Monitoring</CardTitle>
                <CardDescription>MLC and STCW work/rest hours compliance tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {complianceRecords.map((record) => (
                    <Card key={record.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-medium">{record.seafarerName}</h4>
                            <p className="text-sm text-muted-foreground">{record.vessel}</p>
                          </div>
                          <div className={`text-2xl font-bold ${getComplianceColor(record.complianceScore)}`}>
                            {record.complianceScore}%
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-sm text-muted-foreground">This Week</div>
                            <div className={`text-lg font-medium ${record.workHours.thisWeek > 72 ? 'text-destructive' : 'text-foreground'}`}>
                              {record.workHours.thisWeek} hours
                            </div>
                            {record.workHours.thisWeek > 72 && (
                              <div className="text-xs text-destructive">Exceeds limit (72h)</div>
                            )}
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">This Month</div>
                            <div className={`text-lg font-medium ${record.workHours.thisMonth > 300 ? 'text-destructive' : 'text-foreground'}`}>
                              {record.workHours.thisMonth} hours
                            </div>
                            <Progress value={(record.workHours.thisMonth / 300) * 100} className="mt-1" />
                          </div>
                          
                          <div>
                            <div className="text-sm text-muted-foreground">Rest Violations</div>
                            <div className={`text-lg font-medium ${record.workHours.restViolations > 0 ? 'text-destructive' : 'text-success'}`}>
                              {record.workHours.restViolations}
                            </div>
                            {record.workHours.restViolations === 0 && (
                              <div className="text-xs text-success">Compliant</div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audits" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Audit & Inspection History</CardTitle>
                <CardDescription>Port state controls, flag state inspections, and internal audits</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { date: '2024-01-15', type: 'Port State Control', port: 'Rotterdam', result: 'No Deficiencies', inspector: 'Dutch Authorities' },
                    { date: '2024-01-10', type: 'Flag State Inspection', port: 'Malta', result: '2 Minor Deficiencies', inspector: 'Malta Maritime Authority' },
                    { date: '2023-12-20', type: 'Internal Audit', port: 'Hamburg', result: 'Satisfactory', inspector: 'Company QA Team' },
                    { date: '2023-11-28', type: 'MLC Inspection', port: 'Antwerp', result: 'Compliant', inspector: 'Belgian Authorities' }
                  ].map((audit, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{audit.type}</div>
                            <div className="text-sm text-muted-foreground">
                              {audit.port} • {new Date(audit.date).toLocaleDateString()} • {audit.inspector}
                            </div>
                          </div>
                          <div>
                            <Badge 
                              variant={audit.result.includes('No') || audit.result === 'Compliant' || audit.result === 'Satisfactory' ? 'default' : 'destructive'}
                              className={audit.result.includes('No') || audit.result === 'Compliant' || audit.result === 'Satisfactory' ? 'bg-success/20 text-success-foreground' : ''}
                            >
                              {audit.result}
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="violations" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compliance Violations</CardTitle>
                <CardDescription>Track and manage regulatory violations and corrective actions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { 
                      id: 'V001', 
                      seafarer: 'Maria Rodriguez', 
                      violation: 'Work hours exceeded - 14 consecutive hours', 
                      severity: 'High', 
                      date: '2024-01-18',
                      status: 'Open',
                      action: 'Mandatory rest period enforced'
                    },
                    { 
                      id: 'V002', 
                      seafarer: 'Erik Olsen', 
                      violation: 'Missing safety equipment inspection record', 
                      severity: 'Medium', 
                      date: '2024-01-15',
                      status: 'Resolved',
                      action: 'Equipment inspected and logged'
                    },
                    { 
                      id: 'V003', 
                      seafarer: 'John Smith', 
                      violation: 'Late medical certificate renewal', 
                      severity: 'Low', 
                      date: '2024-01-10',
                      status: 'In Progress',
                      action: 'Medical examination scheduled'
                    }
                  ].map((violation) => (
                    <Card key={violation.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="font-medium">{violation.violation}</div>
                            <div className="text-sm text-muted-foreground">
                              {violation.seafarer} • {violation.id} • {new Date(violation.date).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Badge 
                              variant={violation.severity === 'High' ? 'destructive' : violation.severity === 'Medium' ? 'default' : 'secondary'}
                              className={violation.severity === 'Medium' ? 'bg-warning/20 text-warning-foreground' : ''}
                            >
                              {violation.severity}
                            </Badge>
                            <Badge 
                              variant={violation.status === 'Resolved' ? 'default' : 'outline'}
                              className={violation.status === 'Resolved' ? 'bg-success/20 text-success-foreground' : ''}
                            >
                              {violation.status}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <span className="font-medium">Corrective Action:</span> {violation.action}
                        </div>
                        
                        {violation.status !== 'Resolved' && (
                          <div className="flex gap-2 mt-4">
                            <Button variant="outline" size="sm">
                              <FileText className="w-4 h-4 mr-1" />
                              Update
                            </Button>
                            <Button variant="outline" size="sm" className="ocean-gradient">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Resolved
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}