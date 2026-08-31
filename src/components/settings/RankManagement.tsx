import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRanks, useCreateRank, useUpdateRank, useDeleteRank, useInitializeDefaultRanks } from '@/hooks/queries/useRankQueries';
import { useCompany } from '@/context/CompanyContext';
import { Rank } from '@/lib/schemas_v2';
import { Plus, Edit, Trash2, Users, DollarSign, Clock, Award } from 'lucide-react';
import { toast } from 'sonner';

interface RankFormData {
  name: string;
  code: string;
  department: 'deck' | 'engine' | 'catering' | 'other';
  level: number;
  baseSalary: number;
  currency: string;
  isOfficer: boolean;
  description?: string;
  overtimeRates: {
    regular: number;
    weekend: number;
    holiday: number;
  };
  allowances: Array<{
    type: string;
    amount: number;
    description?: string;
  }>;
  certificateRequirements: string[];
}

const initialFormData: RankFormData = {
  name: '',
  code: '',
  department: 'deck',
  level: 1,
  baseSalary: 0,
  currency: 'USD',
  isOfficer: false,
  description: '',
  overtimeRates: {
    regular: 1.5,
    weekend: 2.0,
    holiday: 2.5,
  },
  allowances: [],
  certificateRequirements: [],
};

export function RankManagement() {
  const { selectedCompany: company } = useCompany();
  const [activeTab, setActiveTab] = useState('list');
  const [editingRank, setEditingRank] = useState<Rank | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [formData, setFormData] = useState<RankFormData>(initialFormData);

  const { data: ranks = [], isLoading } = useRanks({ companyId: company?.id });
  const createRank = useCreateRank();
  const updateRank = useUpdateRank(editingRank?.id || '');
  const deleteRank = useDeleteRank();
  const initializeDefaults = useInitializeDefaultRanks();

  const resetForm = () => {
    setFormData(initialFormData);
    setEditingRank(null);
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      toast.error('Rank name is required');
      return false;
    }
    if (!formData.code.trim()) {
      toast.error('Rank code is required');
      return false;
    }
    if (formData.baseSalary <= 0) {
      toast.error('Base salary must be greater than 0');
      return false;
    }
    if (formData.level < 1) {
      toast.error('Hierarchy level must be at least 1');
      return false;
    }
    if (formData.overtimeRates.regular <= 0 || formData.overtimeRates.weekend <= 0 || formData.overtimeRates.holiday <= 0) {
      toast.error('Overtime rates must be greater than 0');
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!company?.id) {
      toast.error('Company not found');
      return;
    }

    if (!validateForm()) return;

    try {
      await createRank.mutateAsync({
        ...formData,
        companyId: company.id,
      });
      toast.success('Rank created successfully');
      setIsCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to create rank');
    }
  };

  const handleEdit = (rank: Rank) => {
    setEditingRank(rank);
    setFormData({
      name: rank.name,
      code: rank.code,
      department: rank.department,
      level: rank.level,
      baseSalary: rank.baseSalary,
      currency: rank.currency,
      isOfficer: rank.isOfficer,
      description: rank.description || '',
      overtimeRates: rank.overtimeRates,
      allowances: rank.allowances,
      certificateRequirements: rank.certificateRequirements,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingRank) return;

    try {
      await updateRank.mutateAsync(formData);
      toast.success('Rank updated successfully');
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Failed to update rank');
    }
  };

  const handleDelete = async (rankId: string) => {
    if (!confirm('Are you sure you want to delete this rank?')) return;

    try {
      await deleteRank.mutateAsync(rankId);
      toast.success('Rank deleted successfully');
    } catch (error) {
      toast.error('Failed to delete rank');
    }
  };

  const handleInitializeDefaults = async () => {
    if (!company?.id) {
      toast.error('Company not found');
      return;
    }

    try {
      await initializeDefaults.mutateAsync(company.id);
      toast.success('Default ranks initialized successfully');
    } catch (error) {
      toast.error('Failed to initialize default ranks');
    }
  };

  const addAllowance = () => {
    setFormData(prev => ({
      ...prev,
      allowances: [...prev.allowances, { type: '', amount: 0, description: '' }],
    }));
  };

  const updateAllowance = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.map((allowance, i) =>
        i === index ? { ...allowance, [field]: value } : allowance
      ),
    }));
  };

  const removeAllowance = (index: number) => {
    setFormData(prev => ({
      ...prev,
      allowances: prev.allowances.filter((_, i) => i !== index),
    }));
  };

  const addCertificateRequirement = () => {
    setFormData(prev => ({
      ...prev,
      certificateRequirements: [...prev.certificateRequirements, ''],
    }));
  };

  const updateCertificateRequirement = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      certificateRequirements: prev.certificateRequirements.map((req, i) =>
        i === index ? value : req
      ),
    }));
  };

  const removeCertificateRequirement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certificateRequirements: prev.certificateRequirements.filter((_, i) => i !== index),
    }));
  };

  const getDepartmentColor = (department: string) => {
    const colors = {
      deck: 'bg-blue-100 text-blue-800',
      engine: 'bg-green-100 text-green-800',
      catering: 'bg-orange-100 text-orange-800',
      other: 'bg-gray-100 text-gray-800',
    };
    return colors[department as keyof typeof colors] || colors.other;
  };

  if (isLoading) {
    return <div>Loading ranks...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Rank Management</h2>
          <p className="text-muted-foreground">Manage crew ranks, salaries, and requirements</p>
        </div>
        <div className="flex gap-2">
          {ranks.length === 0 && (
            <Button onClick={handleInitializeDefaults} variant="outline">
              <Users className="w-4 h-4 mr-2" />
              Initialize Default Ranks
            </Button>
          )}
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="ocean-gradient">
                <Plus className="w-4 h-4 mr-2" />
                Add Rank
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Rank</DialogTitle>
                <DialogDescription>
                  Define a new crew rank with salary scales and requirements
                </DialogDescription>
              </DialogHeader>

              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="salary">Salary & Overtime</TabsTrigger>
                  <TabsTrigger value="allowances">Allowances</TabsTrigger>
                  <TabsTrigger value="certificates">Certificates</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Rank Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="code">Rank Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="department">Department *</Label>
                      <Select
                        value={formData.department}
                        onValueChange={(value: any) => setFormData(prev => ({ ...prev, department: value }))}
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
                    <div>
                      <Label htmlFor="level">Hierarchy Level *</Label>
                      <Input
                        id="level"
                        type="number"
                        min="1"
                        value={formData.level}
                        onChange={(e) => setFormData(prev => ({ ...prev, level: Number(e.target.value) }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="isOfficer"
                      checked={formData.isOfficer}
                      onChange={(e) => setFormData(prev => ({ ...prev, isOfficer: e.target.checked }))}
                    />
                    <Label htmlFor="isOfficer">Officer Rank</Label>
                  </div>
                </TabsContent>

                <TabsContent value="salary" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="baseSalary">Base Salary *</Label>
                      <Input
                        id="baseSalary"
                        type="number"
                        min="0"
                        step="0.01"
                        value={formData.baseSalary}
                        onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency *</Label>
                      <Select
                        value={formData.currency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Overtime Rates</h4>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="regularOT">Regular OT Rate</Label>
                        <Input
                          id="regularOT"
                          type="number"
                          min="1"
                          step="0.1"
                          value={formData.overtimeRates.regular}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            overtimeRates: { ...prev.overtimeRates, regular: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="weekendOT">Weekend OT Rate</Label>
                        <Input
                          id="weekendOT"
                          type="number"
                          min="1"
                          step="0.1"
                          value={formData.overtimeRates.weekend}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            overtimeRates: { ...prev.overtimeRates, weekend: Number(e.target.value) }
                          }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="holidayOT">Holiday OT Rate</Label>
                        <Input
                          id="holidayOT"
                          type="number"
                          min="1"
                          step="0.1"
                          value={formData.overtimeRates.holiday}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            overtimeRates: { ...prev.overtimeRates, holiday: Number(e.target.value) }
                          }))}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="allowances" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Allowances</h4>
                    <Button onClick={addAllowance} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Allowance
                    </Button>
                  </div>

                  {formData.allowances.map((allowance, index) => (
                    <div key={index} className="grid grid-cols-4 gap-2 items-end p-4 border rounded-lg">
                      <div>
                        <Label>Allowance Type</Label>
                        <Input
                          value={allowance.type}
                          onChange={(e) => updateAllowance(index, 'type', e.target.value)}
                          placeholder="e.g., sea_time, subsistence"
                        />
                      </div>
                      <div>
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={allowance.amount}
                          onChange={(e) => updateAllowance(index, 'amount', Number(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Description</Label>
                        <Input
                          value={allowance.description}
                          onChange={(e) => updateAllowance(index, 'description', e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={() => removeAllowance(index)}
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="certificates" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Certificate Requirements</h4>
                    <Button onClick={addCertificateRequirement} size="sm" variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Certificate
                    </Button>
                  </div>

                  {formData.certificateRequirements.map((cert, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <Input
                        value={cert}
                        onChange={(e) => updateCertificateRequirement(index, e.target.value)}
                        placeholder="Certificate name"
                      />
                      <Button
                        onClick={() => removeCertificateRequirement(index)}
                        variant="outline"
                        size="sm"
                        className="text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </TabsContent>
              </Tabs>

              <div className="flex gap-3 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  className="flex-1 ocean-gradient"
                  disabled={createRank.isPending}
                >
                  {createRank.isPending ? 'Creating...' : 'Create Rank'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Crew Ranks ({ranks.length})
          </CardTitle>
          <CardDescription>
            Manage all crew ranks and their associated compensation details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Base Salary</TableHead>
                <TableHead>Officer</TableHead>
                <TableHead>Certificates</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranks
                .sort((a, b) => a.level - b.level)
                .map((rank) => (
                  <TableRow key={rank.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{rank.name}</div>
                        <div className="text-sm text-muted-foreground">{rank.code}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getDepartmentColor(rank.department)}>
                        {rank.department.charAt(0).toUpperCase() + rank.department.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{rank.level}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4" />
                        {rank.baseSalary.toLocaleString()} {rank.currency}
                      </div>
                    </TableCell>
                    <TableCell>
                      {rank.isOfficer ? (
                        <Badge variant="default">Officer</Badge>
                      ) : (
                        <Badge variant="secondary">Rating</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Award className="w-4 h-4" />
                        {rank.certificateRequirements.length}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(rank)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(rank.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Rank</DialogTitle>
            <DialogDescription>
              Update rank details and compensation
            </DialogDescription>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Basic Info</TabsTrigger>
              <TabsTrigger value="salary">Salary & Overtime</TabsTrigger>
              <TabsTrigger value="allowances">Allowances</TabsTrigger>
              <TabsTrigger value="certificates">Certificates</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Rank Name *</Label>
                  <Input
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-code">Rank Code *</Label>
                  <Input
                    id="edit-code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value: any) => setFormData(prev => ({ ...prev, department: value }))}
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
                <div>
                  <Label htmlFor="edit-level">Hierarchy Level *</Label>
                  <Input
                    id="edit-level"
                    type="number"
                    min="1"
                    value={formData.level}
                    onChange={(e) => setFormData(prev => ({ ...prev, level: Number(e.target.value) }))}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="edit-isOfficer"
                  checked={formData.isOfficer}
                  onChange={(e) => setFormData(prev => ({ ...prev, isOfficer: e.target.checked }))}
                />
                <Label htmlFor="edit-isOfficer">Officer Rank</Label>
              </div>
            </TabsContent>

            <TabsContent value="salary" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-baseSalary">Base Salary *</Label>
                  <Input
                    id="edit-baseSalary"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.baseSalary}
                    onChange={(e) => setFormData(prev => ({ ...prev, baseSalary: Number(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="edit-currency">Currency *</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                      <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Overtime Rates</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="edit-regularOT">Regular OT Rate</Label>
                    <Input
                      id="edit-regularOT"
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.overtimeRates.regular}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        overtimeRates: { ...prev.overtimeRates, regular: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-weekendOT">Weekend OT Rate</Label>
                    <Input
                      id="edit-weekendOT"
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.overtimeRates.weekend}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        overtimeRates: { ...prev.overtimeRates, weekend: Number(e.target.value) }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-holidayOT">Holiday OT Rate</Label>
                    <Input
                      id="edit-holidayOT"
                      type="number"
                      min="1"
                      step="0.1"
                      value={formData.overtimeRates.holiday}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        overtimeRates: { ...prev.overtimeRates, holiday: Number(e.target.value) }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="allowances" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Allowances</h4>
                <Button onClick={addAllowance} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Allowance
                </Button>
              </div>

              {formData.allowances.map((allowance, index) => (
                <div key={index} className="grid grid-cols-4 gap-2 items-end p-4 border rounded-lg">
                  <div>
                    <Label>Allowance Type</Label>
                    <Input
                      value={allowance.type}
                      onChange={(e) => updateAllowance(index, 'type', e.target.value)}
                      placeholder="e.g., sea_time, subsistence"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={allowance.amount}
                      onChange={(e) => updateAllowance(index, 'amount', Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={allowance.description}
                      onChange={(e) => updateAllowance(index, 'description', e.target.value)}
                    />
                  </div>
                  <Button
                    onClick={() => removeAllowance(index)}
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="certificates" className="space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">Certificate Requirements</h4>
                <Button onClick={addCertificateRequirement} size="sm" variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Certificate
                </Button>
              </div>

              {formData.certificateRequirements.map((cert, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={cert}
                    onChange={(e) => updateCertificateRequirement(index, e.target.value)}
                    placeholder="Certificate name"
                  />
                  <Button
                    onClick={() => removeCertificateRequirement(index)}
                    variant="outline"
                    size="sm"
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              className="flex-1 ocean-gradient"
              disabled={updateRank.isPending}
            >
              {updateRank.isPending ? 'Updating...' : 'Update Rank'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}