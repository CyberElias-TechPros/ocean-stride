import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Seafarer, Document } from '@/lib/schemas';
import { INDEX_NAMES, STORE_NAMES } from '@/lib/schemas';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { DataTable, ColumnConfig } from '@/components/ui/data-table';
import { exportToCSV } from '@/lib/utils/exportUtils';
import {
  Download,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
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

export default function Compliance() {
   const [certificates, setCertificates] = useState<Certificate[]>([]);
   const [complianceRecords, setComplianceRecords] = useState<ComplianceRecord[]>([]);
   const [seafarers, setSeafarers] = useState<Seafarer[]>([]);
   const [loading, setLoading] = useState(true);
   const { selectedCompany } = useCompany();
   const { toast } = useToast();

   const certificateColumns: ColumnConfig<Certificate>[] = [
     {
       id: 'seafarerName',
       header: 'Seafarer',
       accessor: 'seafarerName',
       sortable: true,
     },
     {
       id: 'type',
       header: 'Certificate Type',
       accessor: 'type',
       sortable: true,
       filterable: true,
     },
     {
       id: 'number',
       header: 'Number',
       accessor: 'number',
       cell: (value) => value || '—',
     },
     {
       id: 'issuingAuthority',
       header: 'Issuing Authority',
       accessor: 'issuingAuthority',
     },
     {
       id: 'issueDate',
       header: 'Issue Date',
       accessor: 'issueDate',
       sortable: true,
       cell: (value) => value ? new Date(value).toLocaleDateString() : '—',
     },
     {
       id: 'expiryDate',
       header: 'Expiry Date',
       accessor: 'expiryDate',
       sortable: true,
       sortKey: 'daysUntilExpiry',
       cell: (value, row) => (
         <div>
           <div>{value ? new Date(value).toLocaleDateString() : '—'}</div>
           {row.status === 'expiring' && (
             <div className="text-xs text-warning">
               {row.daysUntilExpiry} days left
             </div>
           )}
           {row.status === 'expired' && (
             <div className="text-xs text-destructive">
               {Math.abs(row.daysUntilExpiry)} days overdue
             </div>
           )}
         </div>
       ),
     },
     {
       id: 'status',
       header: 'Status',
       accessor: 'status',
       sortable: true,
       filterable: true,
       cell: (value) => getStatusBadge(value),
     },
     {
       id: 'actions',
       header: 'Actions',
       cell: (_, row) => (
         <div className="flex gap-2">
           <Button variant="outline" size="sm">
             <FileText className="w-4 h-4 mr-1" />
             View
           </Button>
           {row.status === 'expiring' && (
             <Button
               variant="outline"
               size="sm"
               className="ocean-gradient"
               onClick={() => handleRenewCertificate(row.id)}
             >
               <RefreshCw className="w-4 h-4 mr-1" />
               Renew
             </Button>
           )}
           {(row.status === 'expiring' || row.status === 'expired') && (
             <Button
               variant="outline"
               size="sm"
               onClick={() => handleGenerateAlert(row.id)}
             >
               <Bell className="w-4 h-4 mr-1" />
               Alert
             </Button>
           )}
         </div>
       ),
     },
   ];

  // Certificate form state
  const [certificateForm, setCertificateForm] = useState({
    seafarerId: '',
    type: '',
    number: '',
    issueDate: '',
    expiryDate: '',
    issuingAuthority: ''
  });
  const [isSubmittingCertificate, setIsSubmittingCertificate] = useState(false);

  // Alert configuration state
  const [alertConfig, setAlertConfig] = useState({
    enableExpiryAlerts: true,
    expiryThresholdDays: 60,
    notificationMethods: ['email'] as string[],
    alertRecipients: ['compliance_officer', 'captain'] as string[],
    enableThresholdAlerts: true,
    complianceThreshold: 90,
    enableWorkHourAlerts: true,
    maxWorkHoursPerWeek: 72
  });
  const [showAlertDialog, setShowAlertDialog] = useState(false);
  const [isSavingAlerts, setIsSavingAlerts] = useState(false);

  useEffect(() => {
    const loadComplianceData = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        const companySeafarers = await db.getSeafarersByCompany(selectedCompany.id);
        setSeafarers(companySeafarers);

        // Build certificates from documents store deterministically
        const certs: Certificate[] = [];
        const records: ComplianceRecord[] = [];

        for (const s of companySeafarers) {
          // Fetch documents linked to this seafarer
          const docs = await db.getByIndex<Document>(
            'documents',
            INDEX_NAMES.DOCUMENT_BY_ENTITY,
            ['seafarer', s.id]
          );

          const seafarerCerts = (docs || [])
            .filter(d => d.type === 'certificate')
            .map((d, idx): Certificate => {
              const issueDate = d.issueDate || '';
              const expiryDate = d.expiryDate || '';
              const daysUntilExpiry = expiryDate
                ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                : 0;
              const status: Certificate['status'] = expiryDate
                ? (daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 60 ? 'expiring' : 'valid')
                : 'valid';
              return {
                id: d.id || `${s.id}-doc-${idx}`,
                seafarerId: s.id,
                seafarerName: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`,
                type: d.name,
                number: '-',
                issueDate,
                expiryDate,
                issuingAuthority: d.description || '—',
                status,
                daysUntilExpiry,
              };
            });

          certs.push(...seafarerCerts);

          // Compute basic compliance score based on certificates
          const expiredCount = seafarerCerts.filter(c => c.status === 'expired').length;
          const expiringCount = seafarerCerts.filter(c => c.status === 'expiring').length;
          const score = Math.max(0, 100 - expiredCount * 20 - expiringCount * 5);

          records.push({
            id: s.id,
            seafarerId: s.id,
            seafarerName: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`,
            vessel: s.employment.currentVesselName || 'Not Assigned',
            workHours: {
              thisWeek: 0,
              thisMonth: 0,
              restViolations: 0,
            },
            certificates: seafarerCerts,
            complianceScore: score,
            lastAudit: '-',
          });
        }

        setCertificates(certs);
        setComplianceRecords(records);
      } catch (error) {
        console.error('Failed to load compliance data:', error);
        toast({
          title: "Error",
          description: "Failed to load compliance data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadComplianceData();
  }, [selectedCompany, toast]);
  // Removed search and filter states - handled by DataTable

  const handleRenewCertificate = (certId: string) => {
    // Simulate certificate renewal
    setCertificates(prev => prev.map(cert => 
      cert.id === certId 
        ? { 
            ...cert, 
            status: 'valid' as const,
            expiryDate: new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 years from now
            daysUntilExpiry: 5 * 365
          }
        : cert
    ));
  };

  const handleGenerateAlert = (certId: string) => {
    const cert = certificates.find(c => c.id === certId);
    if (cert) {
      toast({
        title: "Compliance Alert Generated",
        description: `${cert.type} for ${cert.seafarerName} expires in ${cert.daysUntilExpiry} days`,
        variant: cert.daysUntilExpiry < 30 ? "destructive" : "default"
      });
    }
  };

  const handleExportComplianceReport = () => {
    try {
      const exportData = complianceRecords.map(record => ({
        'Seafarer Name': record.seafarerName,
        'Vessel': record.vessel,
        'Compliance Score': record.complianceScore,
        'Certificates Count': record.certificates.length,
        'Valid Certificates': record.certificates.filter(c => c.status === 'valid').length,
        'Expiring Certificates': record.certificates.filter(c => c.status === 'expiring').length,
        'Expired Certificates': record.certificates.filter(c => c.status === 'expired').length,
        'This Week Hours': record.workHours.thisWeek,
        'This Month Hours': record.workHours.thisMonth,
        'Rest Violations': record.workHours.restViolations,
        'Last Audit': record.lastAudit
      }));

      exportToCSV(exportData, undefined, `compliance_report_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported compliance report for ${complianceRecords.length} seafarers`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export compliance report",
        variant: "destructive"
      });
    }
  };

  const handleAddCertificate = async () => {
    if (!certificateForm.seafarerId || !certificateForm.type || !certificateForm.issueDate || !certificateForm.expiryDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setIsSubmittingCertificate(true);
    try {
      const seafarer = seafarers.find(s => s.id === certificateForm.seafarerId);
      if (!seafarer) {
        throw new Error('Seafarer not found');
      }

      const documentData: Omit<Document, 'id' | 'createdAt' | 'updatedAt'> = {
        type: 'certificate',
        name: certificateForm.type,
        description: certificateForm.issuingAuthority,
        issueDate: certificateForm.issueDate,
        expiryDate: certificateForm.expiryDate,
        fileUrl: '', // No file upload in this simple form
        fileType: 'application/pdf', // Default
        fileSize: 0,
        relatedTo: {
          entityType: 'seafarer',
          entityId: seafarer.id,
          entityName: `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}`
        },
        status: 'valid',
        companyId: selectedCompany?.id,
        notes: `Certificate Number: ${certificateForm.number}`
      };

      await db.add<Document>(STORE_NAMES.DOCUMENTS, documentData);

      // Reset form
      setCertificateForm({
        seafarerId: '',
        type: '',
        number: '',
        issueDate: '',
        expiryDate: '',
        issuingAuthority: ''
      });

      // Refresh compliance data
      const loadComplianceData = async () => {
        if (!selectedCompany) return;

        try {
          await db.init();
          const companySeafarers = await db.getSeafarersByCompany(selectedCompany.id);
          setSeafarers(companySeafarers);

          const certs: Certificate[] = [];
          const records: ComplianceRecord[] = [];

          for (const s of companySeafarers) {
            const docs = await db.getByIndex<Document>(
              'documents',
              INDEX_NAMES.DOCUMENT_BY_ENTITY,
              ['seafarer', s.id]
            );

            const seafarerCerts = (docs || [])
              .filter(d => d.type === 'certificate')
              .map((d, idx): Certificate => {
                const issueDate = d.issueDate || '';
                const expiryDate = d.expiryDate || '';
                const daysUntilExpiry = expiryDate
                  ? Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                  : 0;
                const status: Certificate['status'] = expiryDate
                  ? (daysUntilExpiry < 0 ? 'expired' : daysUntilExpiry <= 60 ? 'expiring' : 'valid')
                  : 'valid';
                return {
                  id: d.id || `${s.id}-doc-${idx}`,
                  seafarerId: s.id,
                  seafarerName: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`,
                  type: d.name,
                  number: certificateForm.number || '-',
                  issueDate,
                  expiryDate,
                  issuingAuthority: d.description || '—',
                  status,
                  daysUntilExpiry,
                };
              });

            certs.push(...seafarerCerts);

            const expiredCount = seafarerCerts.filter(c => c.status === 'expired').length;
            const expiringCount = seafarerCerts.filter(c => c.status === 'expiring').length;
            const score = Math.max(0, 100 - expiredCount * 20 - expiringCount * 5);

            records.push({
              id: s.id,
              seafarerId: s.id,
              seafarerName: `${s.personalInfo.firstName} ${s.personalInfo.lastName}`,
              vessel: s.employment.currentVesselName || 'Not Assigned',
              workHours: {
                thisWeek: 0,
                thisMonth: 0,
                restViolations: 0,
              },
              certificates: seafarerCerts,
              complianceScore: score,
              lastAudit: '-',
            });
          }

          setCertificates(certs);
          setComplianceRecords(records);
        } catch (error) {
          console.error('Failed to refresh compliance data:', error);
        }
      };

      await loadComplianceData();

      toast({
        title: "Certificate Added",
        description: `Certificate has been successfully added for ${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}`
      });
    } catch (error) {
      console.error('Failed to add certificate:', error);
      toast({
        title: "Error",
        description: "Failed to add certificate. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingCertificate(false);
    }
  };

  const handleSaveAlertConfig = async () => {
    setIsSavingAlerts(true);
    try {
      // Save alert configuration to database (mock implementation)
      const alertConfigData = {
        ...alertConfig,
        companyId: selectedCompany?.id,
        updatedAt: new Date().toISOString()
      };

      // In a real implementation, this would save to a settings store
      localStorage.setItem(`alert_config_${selectedCompany?.id}`, JSON.stringify(alertConfigData));

      toast({
        title: "Alert Configuration Saved",
        description: "Compliance alert settings have been updated successfully"
      });

      setShowAlertDialog(false);
    } catch (error) {
      console.error('Failed to save alert configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save alert configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSavingAlerts(false);
    }
  };

  // Removed unused add handler to satisfy lints

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

  // Removed filteredCertificates - handled by DataTable

  const expiringCerts = certificates.filter(c => c.status === 'expiring').length;
  const expiredCerts = certificates.filter(c => c.status === 'expired').length;
  const validCerts = certificates.filter(c => c.status === 'valid').length;
  const avgComplianceScore = Math.round(complianceRecords.reduce((sum, r) => sum + r.complianceScore, 0) / complianceRecords.length);

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Compliance Management</h1>
            <p className="text-muted-foreground">Certificate tracking and regulatory compliance monitoring</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportComplianceReport}>
              <Download className="w-4 h-4 mr-2" />
              Compliance Report
            </Button>
            <Dialog open={showAlertDialog} onOpenChange={setShowAlertDialog}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Bell className="w-4 h-4 mr-2" />
                  Setup Alerts
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Compliance Alert Configuration</DialogTitle>
                  <DialogDescription>
                    Configure automatic alerts for certificate expiry, compliance thresholds, and work hour violations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6">
                  {/* Certificate Expiry Alerts */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Certificate Expiry Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableExpiryAlerts"
                          checked={alertConfig.enableExpiryAlerts}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, enableExpiryAlerts: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="enableExpiryAlerts">Enable certificate expiry alerts</Label>
                      </div>
                      <div className="ml-6">
                        <Label htmlFor="expiryThreshold">Alert threshold (days before expiry)</Label>
                        <Input
                          id="expiryThreshold"
                          type="number"
                          value={alertConfig.expiryThresholdDays}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, expiryThresholdDays: parseInt(e.target.value) }))}
                          className="mt-1"
                          min="1"
                          max="365"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Notification Preferences */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Notification Methods</h4>
                    <div className="space-y-2">
                      {[
                        { id: 'email', label: 'Email Notifications' },
                        { id: 'sms', label: 'SMS Alerts' },
                        { id: 'dashboard', label: 'Dashboard Notifications' },
                        { id: 'mobile', label: 'Mobile Push Notifications' }
                      ].map(method => (
                        <div key={method.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={method.id}
                            checked={alertConfig.notificationMethods.includes(method.id)}
                            onChange={(e) => {
                              const methods = e.target.checked
                                ? [...alertConfig.notificationMethods, method.id]
                                : alertConfig.notificationMethods.filter(m => m !== method.id);
                              setAlertConfig(prev => ({ ...prev, notificationMethods: methods }));
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={method.id}>{method.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alert Recipients */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Alert Recipients</h4>
                    <div className="space-y-2">
                      {[
                        { id: 'compliance_officer', label: 'Compliance Officer' },
                        { id: 'captain', label: 'Vessel Captain' },
                        { id: 'hr_manager', label: 'HR Manager' },
                        { id: 'safety_officer', label: 'Safety Officer' },
                        { id: 'management', label: 'Senior Management' }
                      ].map(recipient => (
                        <div key={recipient.id} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={recipient.id}
                            checked={alertConfig.alertRecipients.includes(recipient.id)}
                            onChange={(e) => {
                              const recipients = e.target.checked
                                ? [...alertConfig.alertRecipients, recipient.id]
                                : alertConfig.alertRecipients.filter(r => r !== recipient.id);
                              setAlertConfig(prev => ({ ...prev, alertRecipients: recipients }));
                            }}
                            className="rounded"
                          />
                          <Label htmlFor={recipient.id}>{recipient.label}</Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Compliance Threshold Alerts */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Compliance Threshold Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableThresholdAlerts"
                          checked={alertConfig.enableThresholdAlerts}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, enableThresholdAlerts: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="enableThresholdAlerts">Enable compliance threshold alerts</Label>
                      </div>
                      <div className="ml-6">
                        <Label htmlFor="complianceThreshold">Compliance threshold (%)</Label>
                        <Input
                          id="complianceThreshold"
                          type="number"
                          value={alertConfig.complianceThreshold}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, complianceThreshold: parseInt(e.target.value) }))}
                          className="mt-1"
                          min="0"
                          max="100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Work Hour Alerts */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium">Work Hour Violation Alerts</h4>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enableWorkHourAlerts"
                          checked={alertConfig.enableWorkHourAlerts}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, enableWorkHourAlerts: e.target.checked }))}
                          className="rounded"
                        />
                        <Label htmlFor="enableWorkHourAlerts">Enable work hour violation alerts</Label>
                      </div>
                      <div className="ml-6">
                        <Label htmlFor="maxWorkHours">Maximum hours per week</Label>
                        <Input
                          id="maxWorkHours"
                          type="number"
                          value={alertConfig.maxWorkHoursPerWeek}
                          onChange={(e) => setAlertConfig(prev => ({ ...prev, maxWorkHoursPerWeek: parseInt(e.target.value) }))}
                          className="mt-1"
                          min="1"
                          max="168"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1" onClick={() => setShowAlertDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 ocean-gradient"
                      onClick={handleSaveAlertConfig}
                      disabled={isSavingAlerts}
                    >
                      {isSavingAlerts ? 'Saving...' : 'Save Configuration'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
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
                  <Select
                    value={certificateForm.seafarerId}
                    onValueChange={(value) => setCertificateForm(prev => ({ ...prev, seafarerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select seafarer" />
                    </SelectTrigger>
                    <SelectContent>
                      {seafarers.map(seafarer => (
                        <SelectItem key={seafarer.id} value={seafarer.id}>
                          {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={certificateForm.type}
                    onValueChange={(value) => setCertificateForm(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="STCW Basic Safety Training">STCW Basic Safety Training</SelectItem>
                      <SelectItem value="Medical Certificate">Medical Certificate</SelectItem>
                      <SelectItem value="Officer of the Watch">Officer of the Watch</SelectItem>
                      <SelectItem value="Engine Management">Engine Management</SelectItem>
                      <SelectItem value="Security Training">Security Training</SelectItem>
                      <SelectItem value="Proficiency in Survival Craft">Proficiency in Survival Craft</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Certificate number"
                    value={certificateForm.number}
                    onChange={(e) => setCertificateForm(prev => ({ ...prev, number: e.target.value }))}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      placeholder="Issue date"
                      value={certificateForm.issueDate}
                      onChange={(e) => setCertificateForm(prev => ({ ...prev, issueDate: e.target.value }))}
                    />
                    <Input
                      type="date"
                      placeholder="Expiry date"
                      value={certificateForm.expiryDate}
                      onChange={(e) => setCertificateForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                    />
                  </div>
                  <Input
                    placeholder="Issuing authority"
                    value={certificateForm.issuingAuthority}
                    onChange={(e) => setCertificateForm(prev => ({ ...prev, issuingAuthority: e.target.value }))}
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setCertificateForm({
                        seafarerId: '',
                        type: '',
                        number: '',
                        issueDate: '',
                        expiryDate: '',
                        issuingAuthority: ''
                      })}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 ocean-gradient"
                      onClick={handleAddCertificate}
                      disabled={isSubmittingCertificate}
                    >
                      {isSubmittingCertificate ? 'Adding...' : 'Add Certificate'}
                    </Button>
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
            {/* Certificates Table */}
            <DataTable
              data={certificates}
              columns={certificateColumns}
              loading={loading}
              emptyMessage="No certificates found. Add certificates to track compliance."
              pageSize={10}
              searchable
              searchPlaceholder="Search certificates, seafarers, or numbers..."
              filterable
              sortable
            />
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
  );
}