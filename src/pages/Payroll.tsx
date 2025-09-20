import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Payroll } from '@/lib/schemas';
import { INDEX_NAMES, STORE_NAMES } from '@/lib/schemas';

import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Search, 
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

  useEffect(() => {
    const loadPayrollData = async () => {
      if (!selectedCompany) return;
      
      try {
        await db.init();
        const [companySeafarers, companyVessels] = await Promise.all([
          db.getSeafarersByCompany(selectedCompany.id),
          db.getVesselsByCompany(selectedCompany.id)
        ]);
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

  const handleProcessPayroll = async (recordId: string) => {
    try {
      const record = payrollRecords.find(r => r.id === recordId);
      if (record) {
        const updatedRecord = { ...record, status: 'processed' as const };
        setPayrollRecords(prev => prev.map(r => r.id === recordId ? updatedRecord : r));
        
        toast({
          title: "Payroll Processed",
          description: `Payroll for ${record.seafarerName} has been processed`
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

  // Removed unused payment completion handler
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
  
  const currencies = ['USD', 'EUR', 'GBP', 'PHP'];

  const handlePayRecord = async (recordId: string) => {
    try {
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

  const filteredRecords = payrollRecords.filter(record => {
    const matchesSearch = record.seafarerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.rank.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
    const matchesCurrency = currencyFilter === 'all' || record.currency === currencyFilter;
    
    return matchesSearch && matchesStatus && matchesCurrency;
  });

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
            <Button variant="outline">
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
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select vessel" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mv-atlantic">MV Atlantic Star</SelectItem>
                      <SelectItem value="mv-mediterranean">MV Mediterranean</SelectItem>
                      <SelectItem value="mv-arctic">MV Arctic Explorer</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="grid grid-cols-2 gap-4">
                    <Input type="date" placeholder="Start date" />
                    <Input type="date" placeholder="End date" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">Cancel</Button>
                    <Button className="flex-1 ocean-gradient">Process</Button>
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
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search seafarers, vessels, or ranks..."
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
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Filter by currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Currencies</SelectItem>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Payroll Records Table */}
            <Card>
              <CardHeader>
                <CardTitle>Payroll Records</CardTitle>
                <CardDescription>
                  Monthly payroll records for all seafarers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seafarer</TableHead>
                      <TableHead>Vessel</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Gross Pay</TableHead>
                      <TableHead>Deductions</TableHead>
                      <TableHead>Net Pay</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => {
                      const grossPay = Object.values(record.earnings).reduce((sum, val) => sum + val, 0);
                      const totalDeductions = Object.values(record.deductions).reduce((sum, val) => sum + val, 0);
                      
                      return (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{record.seafarerName}</div>
                              <div className="text-sm text-muted-foreground">{record.rank}</div>
                            </div>
                          </TableCell>
                          <TableCell>{record.vessel}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {new Date(record.period.start).toLocaleDateString()} -<br/>
                              {new Date(record.period.end).toLocaleDateString()}
                            </div>
                          </TableCell>
                          <TableCell>{grossPay.toLocaleString()} {record.currency}</TableCell>
                          <TableCell>{totalDeductions.toLocaleString()} {record.currency}</TableCell>
                          <TableCell className="font-medium">
                            {record.netPay.toLocaleString()} {record.currency}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{record.currency}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(record.status)}
                              {getStatusBadge(record.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => setSelectedRecord(record)}
                              >
                                <FileSpreadsheet className="w-4 h-4 mr-1" />
                                Details
                              </Button>
                              {record.status === 'draft' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="ocean-gradient"
                                  onClick={() => handleProcessPayroll(record.id)}
                                >
                                  <Calculator className="w-4 h-4 mr-1" />
                                  Process
                                </Button>
                              )}
                              {record.status === 'processed' && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="ocean-gradient"
                                  onClick={() => handlePayRecord(record.id)}
                                >
                                  <CreditCard className="w-4 h-4 mr-1" />
                                  Pay Now
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
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
                  <Button variant="outline" className="flex-1">
                    <Download className="w-4 h-4 mr-2" />
                    Download Payslip
                  </Button>
                  {selectedRecord.status === 'draft' && (
                    <Button className="flex-1 ocean-gradient">
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