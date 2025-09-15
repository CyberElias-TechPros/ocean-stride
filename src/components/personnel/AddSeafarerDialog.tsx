import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { type Seafarer } from '@/lib/database';

interface AddSeafarerDialogProps {
  onAdd: (seafarer: Partial<Seafarer>) => void;
}

export function AddSeafarerDialog({ onAdd }: AddSeafarerDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      dateOfBirth: '',
      passportNumber: '',
      seamanBook: '',
    },
    qualifications: {
      rank: '',
      certificates: [],
    },
    employment: {
      status: 'available' as const,
      currentVessel: '',
      position: '',
      contractStart: '',
      contractEnd: '',
    },
    financial: {
      bankName: '',
      accountNumber: '',
      iban: '',
      swiftCode: '',
      currency: 'USD',
      basicWage: 0,
      overtimeRate: 0,
    }
  });

  const ranks = [
    'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
    'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
    'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Cook', 'Steward'
  ];

  const nationalities = [
    'Philippines', 'India', 'Ukraine', 'Russia', 'Romania', 'Poland',
    'Croatia', 'Bulgaria', 'Myanmar', 'China', 'Turkey', 'Indonesia'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(formData);
    setOpen(false);
    // Reset form
    setFormData({
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        nationality: '',
        dateOfBirth: '',
        passportNumber: '',
        seamanBook: '',
      },
      qualifications: {
        rank: '',
        certificates: [],
      },
      employment: {
        status: 'available' as const,
        currentVessel: '',
        position: '',
        contractStart: '',
        contractEnd: '',
      },
      financial: {
        bankName: '',
        accountNumber: '',
        iban: '',
        swiftCode: '',
        currency: 'USD',
        basicWage: 0,
        overtimeRate: 0,
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="ocean-gradient shadow-ocean">
          <Plus className="w-4 h-4 mr-2" />
          Add Seafarer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Seafarer</DialogTitle>
          <DialogDescription>
            Enter complete seafarer information to add them to the system
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Personal Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
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
                <Label htmlFor="lastName">Last Name *</Label>
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
                <Label htmlFor="email">Email Address *</Label>
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
                <Label htmlFor="phone">Phone Number</Label>
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
                <Label htmlFor="nationality">Nationality</Label>
                <Select
                  value={formData.personalInfo.nationality}
                  onValueChange={(value) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, nationality: value }
                  }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select nationality" />
                  </SelectTrigger>
                  <SelectContent>
                    {nationalities.map(nationality => (
                      <SelectItem key={nationality} value={nationality}>{nationality}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.personalInfo.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, dateOfBirth: e.target.value }
                  }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="passportNumber">Passport Number</Label>
                <Input
                  id="passportNumber"
                  value={formData.personalInfo.passportNumber}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, passportNumber: e.target.value }
                  }))}
                />
              </div>
              <div>
                <Label htmlFor="seamanBook">Seaman's Book</Label>
                <Input
                  id="seamanBook"
                  value={formData.personalInfo.seamanBook}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    personalInfo: { ...prev.personalInfo, seamanBook: e.target.value }
                  }))}
                />
              </div>
            </div>
          </div>

          {/* Professional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Professional Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="rank">Rank/Position *</Label>
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
                <Label htmlFor="status">Employment Status</Label>
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
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="on-leave">On Leave</SelectItem>
                    <SelectItem value="retired">Retired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Financial Information</h3>
            
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
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="NOK">NOK - Norwegian Krone</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-6">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 ocean-gradient">
              Add Seafarer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}