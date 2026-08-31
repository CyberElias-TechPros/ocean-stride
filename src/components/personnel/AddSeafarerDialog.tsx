import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Upload, X } from 'lucide-react';
import { useRanks } from '@/hooks/queries/useRankQueries';
import { useCompany } from '@/context/CompanyContext';
import type { Seafarer, SeafarerDocument, SeafarerTraining, SeafarerMedical } from '@/lib/schemas_v2';

interface AddSeafarerDialogProps {
  onAdd: (seafarer: Partial<Seafarer>) => void;
}

export function AddSeafarerDialog({ onAdd }: AddSeafarerDialogProps) {
  const { selectedCompany: company } = useCompany();
  const { data: ranks = [] } = useRanks({ companyId: company?.id });
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    personalInfo: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      nationality: '',
      dateOfBirth: '',
      placeOfBirth: '',
      maritalStatus: 'single' as 'single' | 'married' | 'divorced' | 'widowed',
      gender: 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      },
      contact: {
        email: '',
        phone: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: '',
        },
      },
      photoUrl: '',
    },
    employment: {
      employeeId: '',
      rank: '',
      rankId: '',
      department: 'deck' as 'deck' | 'engine' | 'catering' | 'other',
      status: 'on_leave' as 'onboard' | 'on_leave' | 'on_training' | 'inactive',
      currentVesselId: '',
      currentVesselName: '',
      signOnDate: '',
      contractEndDate: '',
      baseWage: 0,
      wageCurrency: 'USD',
      workHoursPerWeek: 48,
      leaveDaysPerYear: 30,
      employmentType: 'permanent' as 'permanent' | 'contract' | 'temporary',
      employmentStatus: 'active' as 'active' | 'inactive' | 'suspended' | 'retired',
      joinedDate: new Date().toISOString(),
      notes: '',
    },
    documents: [] as SeafarerDocument[],
    trainings: [] as SeafarerTraining[],
    medicals: [] as SeafarerMedical[],
    skills: [] as string[],
    languages: [] as Array<{
      language: string;
      proficiency: 'basic' | 'intermediate' | 'fluent' | 'native';
    }>,
    notes: '',
  });

  const nationalities = [
    'Philippines', 'India', 'Ukraine', 'Russia', 'Romania', 'Poland',
    'Croatia', 'Bulgaria', 'Myanmar', 'China', 'Turkey', 'Indonesia'
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Map formData to Seafarer schema shape
    const mapped: Partial<Seafarer> = {
      personalInfo: formData.personalInfo,
      documents: formData.documents,
      trainings: formData.trainings,
      medicals: formData.medicals,
      skills: formData.skills,
      languages: formData.languages,
      employment: formData.employment,
      notes: formData.notes,
    };
    onAdd(mapped);
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
        placeOfBirth: '',
        maritalStatus: 'single',
        gender: 'prefer_not_to_say',
        address: {
          street: '',
          city: '',
          state: '',
          postalCode: '',
          country: '',
        },
        contact: {
          email: '',
          phone: '',
          emergencyContact: {
            name: '',
            relationship: '',
            phone: '',
            email: '',
          },
        },
        photoUrl: '',
      },
      employment: {
        employeeId: '',
        rank: '',
        rankId: '',
        department: 'deck',
        status: 'on_leave',
        currentVesselId: '',
        currentVesselName: '',
        signOnDate: '',
        contractEndDate: '',
        baseWage: 0,
        wageCurrency: 'USD',
        workHoursPerWeek: 48,
        leaveDaysPerYear: 30,
        employmentType: 'permanent',
        employmentStatus: 'active',
        joinedDate: new Date().toISOString(),
        notes: '',
      },
      documents: [],
      trainings: [],
      medicals: [],
      skills: [],
      languages: [],
      notes: '',
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
        
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="personal">Personal Info</TabsTrigger>
              <TabsTrigger value="employment">Employment</TabsTrigger>
              <TabsTrigger value="medical">Medical</TabsTrigger>
              <TabsTrigger value="training">Training</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            {/* Personal Info Tab */}
            <TabsContent value="personal" className="space-y-4">
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
                  <Label htmlFor="placeOfBirth">Place of Birth</Label>
                  <Input
                    id="placeOfBirth"
                    value={formData.personalInfo.placeOfBirth}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, placeOfBirth: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="maritalStatus">Marital Status</Label>
                  <Select
                    value={formData.personalInfo.maritalStatus}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      personalInfo: { ...prev.personalInfo, maritalStatus: value as any }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="married">Married</SelectItem>
                      <SelectItem value="divorced">Divorced</SelectItem>
                      <SelectItem value="widowed">Widowed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Address Section */}
              <div className="space-y-2">
                <h4 className="font-medium">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label htmlFor="street">Street Address</Label>
                    <Input
                      id="street"
                      value={formData.personalInfo.address.street}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          address: { ...prev.personalInfo.address, street: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.personalInfo.address.city}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          address: { ...prev.personalInfo.address, city: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="state">State/Province</Label>
                    <Input
                      id="state"
                      value={formData.personalInfo.address.state}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          address: { ...prev.personalInfo.address, state: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="postalCode">Postal Code</Label>
                    <Input
                      id="postalCode"
                      value={formData.personalInfo.address.postalCode}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          address: { ...prev.personalInfo.address, postalCode: e.target.value }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      value={formData.personalInfo.address.country}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          address: { ...prev.personalInfo.address, country: e.target.value }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Employment Tab */}
            <TabsContent value="employment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rank">Rank/Position *</Label>
                  <Select
                    value={formData.employment.rankId}
                    onValueChange={(value) => {
                      const selectedRank = ranks.find(r => r.id === value);
                      setFormData(prev => ({
                        ...prev,
                        employment: {
                          ...prev.employment,
                          rank: selectedRank?.name || '',
                          rankId: value
                        }
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rank" />
                    </SelectTrigger>
                    <SelectContent>
                      {ranks.map(rank => (
                        <SelectItem key={rank.id} value={rank.id}>{rank.name} ({rank.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="department">Department</Label>
                  <Select
                    value={formData.employment.department}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, department: value as any }
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
                      <SelectItem value="onboard">Onboard</SelectItem>
                      <SelectItem value="on_leave">On Leave</SelectItem>
                      <SelectItem value="on_training">On Training</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="employmentType">Employment Type</Label>
                  <Select
                    value={formData.employment.employmentType}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, employmentType: value as any }
                    }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="permanent">Permanent</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="temporary">Temporary</SelectItem>
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
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, baseWage: Number(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="wageCurrency">Currency</Label>
                  <Select
                    value={formData.employment.wageCurrency}
                    onValueChange={(value) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, wageCurrency: value }
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="signOnDate">Sign On Date</Label>
                  <Input
                    id="signOnDate"
                    type="date"
                    value={formData.employment.signOnDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, signOnDate: e.target.value }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="contractEndDate">Contract End Date</Label>
                  <Input
                    id="contractEndDate"
                    type="date"
                    value={formData.employment.contractEndDate}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      employment: { ...prev.employment, contractEndDate: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Medical Tab */}
            <TabsContent value="medical" className="space-y-4">
              <div className="space-y-4">
                {formData.medicals.map((medical, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Medical Record {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          medicals: prev.medicals.filter((_, i) => i !== index)
                        }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={medical.type}
                          onValueChange={(value) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], type: value as any };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
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
                          onChange={(e) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], examinationDate: e.target.value };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={medical.expiryDate}
                          onChange={(e) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], expiryDate: e.target.value };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Doctor Name</Label>
                        <Input
                          value={medical.doctorName}
                          onChange={(e) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], doctorName: e.target.value };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Clinic Name</Label>
                        <Input
                          value={medical.clinicName}
                          onChange={(e) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], clinicName: e.target.value };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Fit to Work</Label>
                        <Select
                          value={medical.isFit ? 'yes' : 'no'}
                          onValueChange={(value) => {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], isFit: value === 'yes' };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }}
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
                    </div>

                    <div>
                      <Label>Restrictions</Label>
                      <Textarea
                        value={medical.restrictions || ''}
                        onChange={(e) => {
                          const updated = [...formData.medicals];
                          updated[index] = { ...updated[index], restrictions: e.target.value };
                          setFormData(prev => ({ ...prev, medicals: updated }));
                        }}
                      />
                    </div>

                    <div>
                      <Label>Upload Document</Label>
                      <Input
                        type="file"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const updated = [...formData.medicals];
                            updated[index] = { ...updated[index], fileUrl: file.name };
                            setFormData(prev => ({ ...prev, medicals: updated }));
                          }
                        }}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    medicals: [...prev.medicals, {
                      type: 'medical',
                      examinationDate: '',
                      expiryDate: '',
                      doctorName: '',
                      clinicName: '',
                      isFit: true,
                      restrictions: '',
                      fileUrl: '',
                      notes: ''
                    }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Medical Record
                </Button>
              </div>
            </TabsContent>

            {/* Training Tab */}
            <TabsContent value="training" className="space-y-4">
              <div className="space-y-4">
                {formData.trainings.map((training, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Training Record {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          trainings: prev.trainings.filter((_, i) => i !== index)
                        }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Course Name</Label>
                        <Input
                          value={training.course}
                          onChange={(e) => {
                            const updated = [...formData.trainings];
                            updated[index] = { ...updated[index], course: e.target.value };
                            setFormData(prev => ({ ...prev, trainings: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Institution</Label>
                        <Input
                          value={training.institution}
                          onChange={(e) => {
                            const updated = [...formData.trainings];
                            updated[index] = { ...updated[index], institution: e.target.value };
                            setFormData(prev => ({ ...prev, trainings: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Completion Date</Label>
                        <Input
                          type="date"
                          value={training.completionDate}
                          onChange={(e) => {
                            const updated = [...formData.trainings];
                            updated[index] = { ...updated[index], completionDate: e.target.value };
                            setFormData(prev => ({ ...prev, trainings: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={training.expiryDate || ''}
                          onChange={(e) => {
                            const updated = [...formData.trainings];
                            updated[index] = { ...updated[index], expiryDate: e.target.value };
                            setFormData(prev => ({ ...prev, trainings: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Certificate Number</Label>
                        <Input
                          value={training.certificateNumber || ''}
                          onChange={(e) => {
                            const updated = [...formData.trainings];
                            updated[index] = { ...updated[index], certificateNumber: e.target.value };
                            setFormData(prev => ({ ...prev, trainings: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Upload Certificate</Label>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const updated = [...formData.trainings];
                              updated[index] = { ...updated[index], fileUrl: file.name };
                              setFormData(prev => ({ ...prev, trainings: updated }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={training.notes || ''}
                        onChange={(e) => {
                          const updated = [...formData.trainings];
                          updated[index] = { ...updated[index], notes: e.target.value };
                          setFormData(prev => ({ ...prev, trainings: updated }));
                        }}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    trainings: [...prev.trainings, {
                      course: '',
                      institution: '',
                      completionDate: '',
                      expiryDate: '',
                      certificateNumber: '',
                      fileUrl: '',
                      notes: ''
                    }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Training Record
                </Button>
              </div>
            </TabsContent>

            {/* Documents Tab */}
            <TabsContent value="documents" className="space-y-4">
              <div className="space-y-4">
                {formData.documents.map((document, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Document {index + 1}</h4>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          documents: prev.documents.filter((_, i) => i !== index)
                        }))}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Type</Label>
                        <Select
                          value={document.type}
                          onValueChange={(value) => {
                            const updated = [...formData.documents];
                            updated[index] = { ...updated[index], type: value as any };
                            setFormData(prev => ({ ...prev, documents: updated }));
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="passport">Passport</SelectItem>
                            <SelectItem value="seaman_book">Seaman's Book</SelectItem>
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
                          value={document.number}
                          onChange={(e) => {
                            const updated = [...formData.documents];
                            updated[index] = { ...updated[index], number: e.target.value };
                            setFormData(prev => ({ ...prev, documents: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Issue Date</Label>
                        <Input
                          type="date"
                          value={document.issueDate}
                          onChange={(e) => {
                            const updated = [...formData.documents];
                            updated[index] = { ...updated[index], issueDate: e.target.value };
                            setFormData(prev => ({ ...prev, documents: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Expiry Date</Label>
                        <Input
                          type="date"
                          value={document.expiryDate}
                          onChange={(e) => {
                            const updated = [...formData.documents];
                            updated[index] = { ...updated[index], expiryDate: e.target.value };
                            setFormData(prev => ({ ...prev, documents: updated }));
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Issued By</Label>
                        <Input
                          value={document.issuedBy}
                          onChange={(e) => {
                            const updated = [...formData.documents];
                            updated[index] = { ...updated[index], issuedBy: e.target.value };
                            setFormData(prev => ({ ...prev, documents: updated }));
                          }}
                        />
                      </div>
                      <div>
                        <Label>Upload Document</Label>
                        <Input
                          type="file"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const updated = [...formData.documents];
                              updated[index] = { ...updated[index], fileUrl: file.name };
                              setFormData(prev => ({ ...prev, documents: updated }));
                            }
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Textarea
                        value={document.notes || ''}
                        onChange={(e) => {
                          const updated = [...formData.documents];
                          updated[index] = { ...updated[index], notes: e.target.value };
                          setFormData(prev => ({ ...prev, documents: updated }));
                        }}
                      />
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    documents: [...prev.documents, {
                      type: 'passport',
                      number: '',
                      issueDate: '',
                      expiryDate: '',
                      issuedBy: '',
                      fileUrl: '',
                      notes: ''
                    }]
                  }))}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
            </TabsContent>

            {/* Emergency Contacts Tab */}
            <TabsContent value="emergency" className="space-y-4">
              <div className="space-y-4">
                <h4 className="font-medium">Emergency Contact</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyName">Name</Label>
                    <Input
                      id="emergencyName"
                      value={formData.personalInfo.contact.emergencyContact.name}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          contact: {
                            ...prev.personalInfo.contact,
                            emergencyContact: {
                              ...prev.personalInfo.contact.emergencyContact,
                              name: e.target.value
                            }
                          }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyRelationship">Relationship</Label>
                    <Input
                      id="emergencyRelationship"
                      value={formData.personalInfo.contact.emergencyContact.relationship}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          contact: {
                            ...prev.personalInfo.contact,
                            emergencyContact: {
                              ...prev.personalInfo.contact.emergencyContact,
                              relationship: e.target.value
                            }
                          }
                        }
                      }))}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergencyPhone">Phone Number</Label>
                    <Input
                      id="emergencyPhone"
                      value={formData.personalInfo.contact.emergencyContact.phone}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          contact: {
                            ...prev.personalInfo.contact,
                            emergencyContact: {
                              ...prev.personalInfo.contact.emergencyContact,
                              phone: e.target.value
                            }
                          }
                        }
                      }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergencyEmail">Email</Label>
                    <Input
                      id="emergencyEmail"
                      type="email"
                      value={formData.personalInfo.contact.emergencyContact.email || ''}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        personalInfo: {
                          ...prev.personalInfo,
                          contact: {
                            ...prev.personalInfo.contact,
                            emergencyContact: {
                              ...prev.personalInfo.contact.emergencyContact,
                              email: e.target.value
                            }
                          }
                        }
                      }))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

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