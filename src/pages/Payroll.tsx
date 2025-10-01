import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Payroll, Vessel } from '@/lib/schemas';
import { INDEX_NAMES, STORE_NAMES } from '@/lib/schemas';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DataTable, ColumnConfig } from '@/components/ui/data-table';
import {
  Download,
  DollarSign,
  CreditCard,
  Calculator,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Clock,
  Plus,
  Users,
  Globe
} from 'lucide-react';
import { exportToCSV } from '@/lib/utils/exportUtils';

interface PayrollRecord {
  id: string;
  seafarerId: string;
  seafarerName: string;
  rank: string;
  vessel: string;
  period: {
    start: string;
    end: string;
  };
  earnings: {
    basicWage: number;
    overtime: number;
    allowances: number;
    bonuses: number;
  };
  deductions: {
    taxes: number;
    insurance: number;
    allotments: number;
    other: number;
  };
  netPay: number;
  currency: string;
  status: 'draft' | 'processed' | 'paid';
  exchangeRate?: number;
}

export default function Payroll() {
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  // Payroll processing form state
  const [payrollForm, setPayrollForm] = useState({
    vesselId: '',
    startDate: '',
    endDate: ''
  });
  const [isProcessingPayroll, setIsProcessingPayroll] = useState(false);
  const [vessels, setVessels] = useState<Vessel[]>([]);

  useEffect(() => {
    const loadPayrollData = async () => {
      if (!selectedCompany) return;

      try {
        await db.init();
        const [companySeafarers, companyVessels] = await Promise.all([
          db.getSeafarersByCompany(selectedCompany.id),
          db.getVesselsByCompany(selectedCompany.id)
        ]);
        setVessels(companyVessels);
        // No need to persist seafarers/vessels in state; we use locals only

        // Fetch payrolls for all seafarers of this company
        const payrolls: Payroll[] = (
          await Promise.all(
            companySeafarers.map(s => db.getByIndex<Payroll>(STORE_NAMES.PAYROLLS, INDEX_NAMES.PAYROLL_BY_SEAFARER, s.id))
          )
        ).flat();

        // Map payroll schema to UI-friendly records deterministically
        const records: PayrollRecord[] = payrolls.map(p => {
          const seafarer = companySeafarers.find(s => s.id === p.seafarerId);
          const vesselName = p.vesselName || companyVessels.find(v => v.id === p.vesselId)?.name || 'Not Assigned';

          const bonusesTotal = (p.bonuses || []).reduce((sum, b) => sum + (b.amount || 0), 0);
          const deductionsTotal = (p.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
          const overtimeAmount = (p.overtimeHours || 0) * (p.overtimeRate || 0);

          const earnings = {
            basicWage: p.basicSalary || 0,
            overtime: overtimeAmount,
            allowances: 0,
            bonuses: bonusesTotal,
          };
          const deductions = {
            taxes: 0,
            insurance: 0,
            allotments: 0,
            other: deductionsTotal,
          };

          return {
            id: p.id,
            seafarerId: p.seafarerId,
            seafarerName: seafarer ? `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}` : p.seafarerName || p.seafarerId,
            rank: seafarer?.employment.rank || '—',
            vessel: vesselName,
            period: { start: p.periodStart, end: p.periodEnd },
            earnings,
            deductions,
            netPay: p.netSalary || 0,
            currency: p.currency || 'USD',
            status: p.status === 'paid' ? 'paid' : p.status === 'pending' ? 'processed' : 'draft',
            exchangeRate: 1,
          };
        });

        setPayrollRecords(records);
      } catch (error) {
        console.error('Failed to load payroll data:', error);
        toast({
          title: "Error",
          description: "Failed to load payroll data",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadPayrollData();
  }, [selectedCompany, toast]);

  const handleProcessRecord = async (recordId: string) => {
    try {
      // Update status in database
      await db.update<Payroll>(STORE_NAMES.PAYROLLS, recordId, {
        status: 'pending'
      });

      // Update local state
      const record = payrollRecords.find(r => r.id === recordId);
      if (record) {
        const updatedRecord = { ...record, status: 'processed' as const };
        setPayrollRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));

        toast({
          title: "Payroll Processed",
          description: `Payroll for ${record.seafarerName} has been submitted for approval`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process payroll",
        variant: "destructive"
      });
    }
  };

  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);

  const payrollColumns: ColumnConfig<PayrollRecord>[] = [
    {
      id: 'seafarerName',
      header: 'Seafarer',
      accessor: 'seafarerName',
      sortable: true,
      cell: (value, row) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{row.rank}</div>
        </div>
      ),
    },
    {
      id: 'vessel',
      header: 'Vessel',
      accessor: 'vessel',
      sortable: true,
      filterable: true,
    },
    {
      id: 'period',
      header: 'Period',
      accessor: (row) => row.period,
      sortable: true,
      sortKey: (row) => new Date(row.period.start).getTime(),
      cell: (value) => (
        <div className="text-sm">
          {new Date(value.start).toLocaleDateString()} -<br/>
          {new Date(value.end).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'grossPay',
      header: 'Gross Pay',
      accessor: (row) => Object.values(row.earnings).reduce((sum, val) => sum + val, 0),
      sortable: true,
      cell: (value, row) => `${value.toLocaleString()} ${row.currency}`,
    },
    {
      id: 'deductions',
      header: 'Deductions',
      accessor: (row) => Object.values(row.deductions).reduce((sum, val) => sum + val, 0),
      sortable: true,
      cell: (value, row) => `${value.toLocaleString()} ${row.currency}`,
    },
    {
      id: 'netPay',
      header: 'Net Pay',
      accessor: 'netPay',
      sortable: true,
      cell: (value, row) => (
        <div className="font-medium">
          {value.toLocaleString()} {row.currency}
        </div>
      ),
    },
    {
      id: 'currency',
      header: 'Currency',
      accessor: 'currency',
      filterable: true,
      cell: (value) => <Badge variant="outline">{value}</Badge>,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: 'status',
      sortable: true,
      filterable: true,
      cell: (value) => (
        <div className="flex items-center gap-2">
          {getStatusIcon(value)}
          {getStatusBadge(value)}
        </div>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: (_, row) => (
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelectedRecord(row)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1" />
            Details
          </Button>
          {row.status === 'draft' && (
            <Button
              variant="outline"
              size="sm"
              className="ocean-gradient"
              onClick={() => handleProcessRecord(row.id)}
            >
              <Calculator className="w-4 h-4 mr-1" />
              Process
            </Button>
          )}
          {row.status === 'processed' && (
            <Button
              variant="outline"
              size="sm"
              className="ocean-gradient"
              onClick={() => handlePayRecord(row.id)}
            >
              <CreditCard className="w-4 h-4 mr-1" />
              Pay Now
            </Button>
          )}
        </div>
      ),
    },
  ];

  const handlePayRecord = async (recordId: string) => {
    try {
      // Update status in database
      await db.update<Payroll>(STORE_NAMES.PAYROLLS, recordId, {
        status: 'paid',
        paymentDate: new Date().toISOString()
      });

      // Update local state
      const record = payrollRecords.find(r => r.id === recordId);
      if (record) {
        const updatedRecord = { ...record, status: 'paid' as const };
        setPayrollRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));

        toast({
          title: "Payment Complete",
          description: `Payment to ${record.seafarerName} has been completed`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete payment",
        variant: "destructive"
      });
    }
  };

  const handleBulkProcessPayroll = async () => {
    if (!payrollForm.vesselId || !payrollForm.startDate || !payrollForm.endDate) {
      toast({
        title: "Validation Error",
        description: "Please select a vessel and date range",
        variant: "destructive"
      });
      return;
    }

    if (!selectedCompany) return;

    setIsProcessingPayroll(true);
    try {
      const vessel = vessels.find(v => v.id === payrollForm.vesselId);
      if (!vessel) {
        throw new Error('Vessel not found');
      }

      // Get seafarers assigned to this vessel
      const companySeafarers = await db.getSeafarersByCompany(selectedCompany.id);
      const assignedSeafarers = companySeafarers.filter(s => s.employment.currentVesselId === payrollForm.vesselId);

      if (assignedSeafarers.length === 0) {
        toast({
          title: "No Seafarers Found",
          description: `No seafarers are currently assigned to ${vessel.name}`,
          variant: "destructive"
        });
        return;
      }

      // Create payroll records for each seafarer
      const payrollPromises = assignedSeafarers.map(async (seafarer) => {
        const payrollData: Omit<Payroll, 'id' | 'createdAt' | 'updatedAt'> = {
          seafarerId: seafarer.id,
          seafarerName: `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}`,
          vesselId: vessel.id,
          vesselName: vessel.name,
          periodStart: payrollForm.startDate,
          periodEnd: payrollForm.endDate,
          basicSalary: seafarer.employment.baseWage,
          overtimeHours: 0, // Could be calculated based on work hours
          overtimeRate: seafarer.employment.baseWage * 0.5, // 50% overtime rate
          bonuses: [],
          deductions: [],
          netSalary: seafarer.employment.baseWage, // Simplified, no deductions
          currency: seafarer.employment.wageCurrency,
          paymentDate: '', // Will be set when paid
          paymentMethod: 'bank_transfer',
          status: 'draft',
          companyId: selectedCompany?.id
        };

        return db.add<Payroll>(STORE_NAMES.PAYROLLS, payrollData);
      });

      await Promise.all(payrollPromises);

      // Reset form
      setPayrollForm({
        vesselId: '',
        startDate: '',
        endDate: ''
      });

      // Refresh payroll data
      const loadPayrollData = async () => {
        if (!selectedCompany) return;

        try {
          await db.init();
          const [companySeafarers, companyVessels] = await Promise.all([
            db.getSeafarersByCompany(selectedCompany.id),
            db.getVesselsByCompany(selectedCompany.id)
          ]);
          setVessels(companyVessels);

          const payrolls: Payroll[] = (
            await Promise.all(
              companySeafarers.map(s => db.getByIndex<Payroll>(STORE_NAMES.PAYROLLS, INDEX_NAMES.PAYROLL_BY_SEAFARER, s.id))
            )
          ).flat();

          const records: PayrollRecord[] = payrolls.map(p => {
            const seafarer = companySeafarers.find(s => s.id === p.seafarerId);
            const vesselName = p.vesselName || companyVessels.find(v => v.id === p.vesselId)?.name || 'Not Assigned';

            const bonusesTotal = (p.bonuses || []).reduce((sum, b) => sum + (b.amount || 0), 0);
            const deductionsTotal = (p.deductions || []).reduce((sum, d) => sum + (d.amount || 0), 0);
            const overtimeAmount = (p.overtimeHours || 0) * (p.overtimeRate || 0);

            const earnings = {
              basicWage: p.basicSalary || 0,
              overtime: overtimeAmount,
              allowances: 0,
              bonuses: bonusesTotal,
            };
            const deductions = {
              taxes: 0,
              insurance: 0,
              allotments: 0,
              other: deductionsTotal,
            };

            return {
              id: p.id,
              seafarerId: p.seafarerId,
              seafarerName: seafarer ? `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}` : p.seafarerName || p.seafarerId,
              rank: seafarer?.employment.rank || '—',
              vessel: vesselName,
              period: { start: p.periodStart, end: p.periodEnd },
              earnings,
              deductions,
              netPay: p.netSalary || 0,
              currency: p.currency || 'USD',
              status: p.status === 'paid' ? 'paid' : p.status === 'pending' ? 'processed' : 'draft',
              exchangeRate: 1,
            };
          });

          setPayrollRecords(records);
        } catch (error) {
          console.error('Failed to refresh payroll data:', error);
        }
      };

      await loadPayrollData();

      toast({
        title: "Payroll Processed",
        description: `Payroll records created for ${assignedSeafarers.length} seafarers on ${vessel.name}`
      });
    } catch (error) {
      console.error('Failed to process payroll:', error);
      toast({
        title: "Error",
        description: "Failed to process payroll. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsProcessingPayroll(false);
    }
  };

  const generatePayslip = (record: PayrollRecord) => {
    const grossPay = Object.values(record.earnings).reduce((sum, val) => sum + val, 0);
    const totalDeductions = Object.values(record.deductions).reduce((sum, val) => sum + val, 0);

    const payslipContent = `
PAYSLIP
========

Seafarer: ${record.seafarerName}
Rank: ${record.rank}
Vessel: ${record.vessel}
Period: ${new Date(record.period.start).toLocaleDateString()} - ${new Date(record.period.end).toLocaleDateString()}

EARNINGS:
---------
Basic Wage: ${record.earnings.basicWage.toLocaleString()} ${record.currency}
Overtime: ${record.earnings.overtime.toLocaleString()} ${record.currency}
Allowances: ${record.earnings.allowances.toLocaleString()} ${record.currency}
Bonuses: ${record.earnings.bonuses.toLocaleString()} ${record.currency}
Gross Pay: ${grossPay.toLocaleString()} ${record.currency}

DEDUCTIONS:
-----------
Taxes: ${record.deductions.taxes.toLocaleString()} ${record.currency}
Insurance: ${record.deductions.insurance.toLocaleString()} ${record.currency}
Allotments: ${record.deductions.allotments.toLocaleString()} ${record.currency}
Other: ${record.deductions.other.toLocaleString()} ${record.currency}
Total Deductions: ${totalDeductions.toLocaleString()} ${record.currency}

NET PAY: ${record.netPay.toLocaleString()} ${record.currency}

Generated on: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([payslipContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payslip_${record.seafarerName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Payslip Downloaded",
      description: `Payslip for ${record.seafarerName} has been downloaded`
    });
  };

  const handleExportPayroll = () => {
    try {
      const exportData = payrollRecords.map(record => ({
        'Seafarer Name': record.seafarerName,
        'Rank': record.rank,
        'Vessel': record.vessel,
        'Period Start': record.period.start,
        'Period End': record.period.end,
        'Basic Wage': record.earnings.basicWage,
        'Overtime': record.earnings.overtime,
        'Allowances': record.earnings.allowances,
        'Bonuses': record.earnings.bonuses,
        'Gross Pay': Object.values(record.earnings).reduce((sum, val) => sum + val, 0),
        'Taxes': record.deductions.taxes,
        'Insurance': record.deductions.insurance,
        'Allotments': record.deductions.allotments,
        'Other Deductions': record.deductions.other,
        'Total Deductions': Object.values(record.deductions).reduce((sum, val) => sum + val, 0),
        'Net Pay': record.netPay,
        'Currency': record.currency,
        'Status': record.status
      }));

      exportToCSV(exportData, undefined, `payroll_data_${new Date().toISOString().split('T')[0]}.csv`);

      toast({
        title: "Export Successful",
        description: `Exported payroll data for ${payrollRecords.length} records`
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export payroll data",
        variant: "destructive"
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4 text-success" />;
      case 'processed': return <Clock className="w-4 h-4 text-warning" />;
      case 'draft': return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'secondary',
      processed: 'default',
      paid: 'default'
    } as const;

    const colors = {
      draft: 'bg-muted text-muted-foreground',
      processed: 'bg-warning/20 text-warning-foreground',
      paid: 'bg-success/20 text-success-foreground'
    };

    return (
      <Badge variant={variants[status as keyof typeof variants]} className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  // Removed filteredRecords - handled by DataTable

  const totalPayroll = payrollRecords.reduce((sum, record) => sum + record.netPay, 0);
  const monthlyAverage = totalPayroll / 12;
  const pendingPayments = payrollRecords.filter(r => r.status !== 'paid').length;

  return (
    <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payroll Management</h1>
            <p className="text-muted-foreground">Multi-currency payroll processing and wage management</p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportPayroll}>
              <Download className="w-4 h-4 mr-2" />
              Export Payroll
            </Button>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="ocean-gradient">
                  <Plus className="w-4 h-4 mr-2" />
                  Process Payroll
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Process New Payroll</DialogTitle>
                  <DialogDescription>
                    Generate payroll for a specific period and vessel
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={payrollForm.vesselId}
                    onValueChange={(value) => setPayrollForm(prev => ({ ...prev, vesselId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      {vessels.map(vessel => (
                        <SelectItem key={vessel.id} value={vessel.id}>{vessel.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={payrollForm.startDate}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                    <Input
                      type="date"
                      placeholder="End date"
                      value={payrollForm.endDate}
                      onChange={(e) => setPayrollForm(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setPayrollForm({ vesselId: '', startDate: '', endDate: '' })}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 ocean-gradient"
                      onClick={handleBulkProcessPayroll}
                      disabled={isProcessingPayroll}
                    >
                      {isProcessingPayroll ? 'Processing...' : 'Process'}
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
              <CardTitle className="text-sm font-medium">Total Monthly Payroll</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPayroll.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">+8% from last month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average per Seafarer</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Math.round(monthlyAverage).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Across all ranks</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingPayments}</div>
              <p className="text-xs text-muted-foreground">Require processing</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Multi-Currency</CardTitle>
              <Globe className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">6</div>
              <p className="text-xs text-muted-foreground">Active currencies</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="records" className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">Payroll Records</TabsTrigger>
            <TabsTrigger value="allotments">Allotments</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="exchange">Exchange Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-4">
            {/* Payroll Records Table */}
            <DataTable
              data={payrollRecords}
              columns={payrollColumns}
              loading={loading}
              emptyMessage="No payroll records found. Process payroll to get started."
              pageSize={10}
              searchable
              searchPlaceholder="Search seafarers, vessels, or ranks..."
              filterable
              sortable
            />
          </TabsContent>

          <TabsContent value="allotments" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Seafarer Allotments</CardTitle>
                <CardDescription>Manage automatic wage transfers to families</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'John Smith', allotment: '$4,000', percentage: '47%', beneficiary: 'Sarah Smith', bank: 'Wells Fargo' },
                    { name: 'Maria Rodriguez', allotment: '€3,000', percentage: '48%', beneficiary: 'Carlos Rodriguez', bank: 'Banco Santander' },
                    { name: 'Erik Olsen', allotment: '20,000 NOK', percentage: '53%', beneficiary: 'Anna Olsen', bank: 'DNB Bank' }
                  ].map((allotment, idx) => (
                    <Card key={idx}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{allotment.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {allotment.allotment} ({allotment.percentage}) → {allotment.beneficiary}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium">{allotment.bank}</div>
                            <Button variant="outline" size="sm" className="mt-2">
                              <CreditCard className="w-4 h-4 mr-1" />
                              Transfer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Payroll Trends</CardTitle>
                  <CardDescription>Monthly payroll overview</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    <TrendingUp className="w-8 h-8 mr-2" />
                    Payroll trends chart would be here
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Cost Breakdown</CardTitle>
                  <CardDescription>Expenses by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { category: 'Basic Wages', amount: '$285,000', percentage: '65%' },
                      { category: 'Overtime', amount: '$54,000', percentage: '12%' },
                      { category: 'Allowances', amount: '$38,000', percentage: '9%' },
                      { category: 'Benefits', amount: '$32,000', percentage: '7%' },
                      { category: 'Bonuses', amount: '$28,000', percentage: '6%' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center">
                        <div>
                          <div className="font-medium">{item.category}</div>
                          <div className="text-sm text-muted-foreground">{item.percentage} of total</div>
                        </div>
                        <div className="font-medium">{item.amount}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="exchange" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Exchange Rates</CardTitle>
                <CardDescription>Current currency exchange rates (USD base)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[
                    { currency: 'EUR', rate: '0.8500', change: '+0.12%' },
                    { currency: 'GBP', rate: '0.7800', change: '-0.08%' },
                    { currency: 'NOK', rate: '11.2000', change: '+0.25%' },
                    { currency: 'SEK', rate: '10.8500', change: '+0.18%' },
                    { currency: 'DKK', rate: '6.3400', change: '+0.05%' },
                    { currency: 'PHP', rate: '56.2000', change: '-0.15%' }
                  ].map(rate => (
                    <Card key={rate.currency}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="font-medium">{rate.currency}/USD</div>
                            <div className="text-2xl font-bold">{rate.rate}</div>
                          </div>
                          <div className={`text-sm ${rate.change.startsWith('+') ? 'text-success' : 'text-destructive'}`}>
                            {rate.change}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Payroll Detail Modal */}
        {selectedRecord && (
          <Dialog open={!!selectedRecord} onOpenChange={() => setSelectedRecord(null)}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Payroll Details - {selectedRecord.seafarerName}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedRecord.period.start).toLocaleDateString()} - {new Date(selectedRecord.period.end).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Earnings</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Basic Wage:</span>
                        <span>{selectedRecord.earnings.basicWage.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Overtime:</span>
                        <span>{selectedRecord.earnings.overtime.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allowances:</span>
                        <span>{selectedRecord.earnings.allowances.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Bonuses:</span>
                        <span>{selectedRecord.earnings.bonuses.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Gross Pay:</span>
                        <span>{Object.values(selectedRecord.earnings).reduce((sum, val) => sum + val, 0).toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-3">Deductions</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Taxes:</span>
                        <span>{selectedRecord.deductions.taxes.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Insurance:</span>
                        <span>{selectedRecord.deductions.insurance.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Allotments:</span>
                        <span>{selectedRecord.deductions.allotments.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Other:</span>
                        <span>{selectedRecord.deductions.other.toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total Deductions:</span>
                        <span>{Object.values(selectedRecord.deductions).reduce((sum, val) => sum + val, 0).toLocaleString()} {selectedRecord.currency}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Pay:</span>
                    <span>{selectedRecord.netPay.toLocaleString()} {selectedRecord.currency}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" className="flex-1" onClick={() => generatePayslip(selectedRecord)}>
                    <Download className="w-4 h-4 mr-2" />
                    Download Payslip
                  </Button>
                  {selectedRecord.status === 'draft' && (
                    <Button className="flex-1 ocean-gradient" onClick={() => handleProcessRecord(selectedRecord.id)}>
                      <Calculator className="w-4 h-4 mr-2" />
                      Process Payment
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
  );
}