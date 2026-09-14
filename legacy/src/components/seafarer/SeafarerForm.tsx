import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Seafarer } from '@/lib/schemas_v2';
import { useToast } from '@/components/ui/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

// Define document schema
const documentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Document name is required'),
  type: z.string().min(1, 'Document type is required'),
  file: z.instanceof(File).optional(),
  url: z.string().optional(),
  issueDate: z.date().optional(),
  expiryDate: z.date().optional(),
  status: z.enum(['valid', 'expired', 'expiring_soon', 'missing']).default('valid'),
  notes: z.string().optional(),
});

// type DocumentType = z.infer<typeof documentSchema>;

// Define form schema using Zod
const seafarerFormSchema = z.object({
  // Personal Information
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
    middleName: z.string().max(50, 'Middle name is too long').optional(),
    lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
    dateOfBirth: z.date({
      required_error: 'Date of birth is required',
      invalid_type_error: 'Invalid date',
    }),
    placeOfBirth: z.string().min(1, 'Place of birth is required'),
    nationality: z.string().min(1, 'Nationality is required'),
    gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).default('prefer_not_to_say'),
    maritalStatus: z.enum(['single', 'married', 'divorced', 'widowed', 'separated']).default('single'),
    bloodType: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']).optional(),
    
    // Contact Information
    contact: z.object({
      email: z.string().email('Invalid email address'),
      phone: z.string().min(10, 'Phone number must be at least 10 digits'),
      address: z.object({
        street: z.string().min(1, 'Street address is required'),
        city: z.string().min(1, 'City is required'),
        state: z.string().min(1, 'State/Province is required'),
        postalCode: z.string().min(1, 'Postal code is required'),
        country: z.string().min(1, 'Country is required'),
      }),
      emergencyContact: z.object({
        name: z.string().min(1, 'Emergency contact name is required'),
        relationship: z.string().min(1, 'Relationship is required'),
        phone: z.string().min(10, 'Emergency contact phone is required'),
        email: z.string().email('Invalid email address').optional(),
        address: z.string().optional(),
      }),
    }),
  }),
  
  // Employment Information
  employment: z.object({
    employeeId: z.string().min(1, 'Employee ID is required'),
    rank: z.string().min(1, 'Rank is required'),
    department: z.enum(['deck', 'engine', 'catering', 'electrical', 'other']),
    status: z.enum(['onboard', 'on_leave', 'on_training', 'inactive']),
    employmentType: z.enum(['permanent', 'contract', 'temporary']),
    joinedDate: z.date({
      required_error: 'Joined date is required',
      invalid_type_error: 'Invalid date',
    }),
    contractStartDate: z.date({
      required_error: 'Contract start date is required',
      invalid_type_error: 'Invalid date',
    }),
    contractEndDate: z.date({
      required_error: 'Contract end date is required',
      invalid_type_error: 'Invalid date',
    }).optional(),
    baseWage: z.number().min(0, 'Base wage must be a positive number'),
    wageCurrency: z.string().min(1, 'Currency is required'),
    bankAccount: z.object({
      accountNumber: z.string().min(1, 'Account number is required'),
      bankName: z.string().min(1, 'Bank name is required'),
      branch: z.string().optional(),
      swiftCode: z.string().optional(),
      iban: z.string().optional(),
    }).optional(),
    taxInformation: z.object({
      taxId: z.string().optional(),
      taxStatus: z.string().optional(),
      socialSecurityNumber: z.string().optional(),
    }).optional(),
  }),
  
  // Documents
  documents: z.array(documentSchema).default([]),
  
  // Medical Information
  medicalInfo: z.object({
    bloodGroup: z.string().optional(),
    allergies: z.array(z.string()).default([]),
    medicalConditions: z.array(z.string()).default([]),
    lastMedicalCheckup: z.date().optional(),
    nextMedicalCheckup: z.date().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  // Training & Certifications
  trainings: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Training name is required'),
    provider: z.string().optional(),
    issueDate: z.date().optional(),
    expiryDate: z.date().optional(),
    status: z.enum(['valid', 'expired', 'expiring_soon', 'missing']).default('valid'),
    documentId: z.string().optional(),
  })).default([]),
  
  // Emergency Contacts (additional)
  emergencyContacts: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, 'Name is required'),
    relationship: z.string().min(1, 'Relationship is required'),
    phone: z.string().min(1, 'Phone number is required'),
    email: z.string().email('Invalid email').optional(),
    address: z.string().optional(),
    isPrimary: z.boolean().default(false),
  })).default([]),
  
  // Notes
  notes: z.string().optional(),
});

type SeafarerFormValues = z.infer<typeof seafarerFormSchema>;

interface SeafarerFormProps {
  initialData?: Partial<Seafarer>;
  onSubmit: (data: SeafarerFormValues) => Promise<void> | void;
  onCancel: () => void;
  className?: string;
}

// Constants
const RANKS = [
  { value: 'captain', label: 'Captain' },
  { value: 'chief_officer', label: 'Chief Officer' },
  { value: 'second_officer', label: 'Second Officer' },
  { value: 'third_officer', label: 'Third Officer' },
  { value: 'chief_engineer', label: 'Chief Engineer' },
  { value: 'second_engineer', label: 'Second Engineer' },
  { value: 'third_engineer', label: 'Third Engineer' },
  { value: 'fourth_engineer', label: 'Fourth Engineer' },
  { value: 'electrical_engineer', label: 'Electrical Engineer' },
  { value: 'electro_technical_officer', label: 'Electro-Technical Officer' },
  { value: 'bosun', label: 'Bosun' },
  { value: 'able_seaman', label: 'Able Seaman' },
  { value: 'ordinary_seaman', label: 'Ordinary Seaman' },
  { value: 'deck_rating', label: 'Deck Rating' },
  { value: 'engine_rating', label: 'Engine Rating' },
  { value: 'cook', label: 'Cook' },
  { value: 'steward', label: 'Steward' },
  { value: 'other', label: 'Other' },
];

const DEPARTMENTS = [
  { value: 'deck', label: 'Deck' },
  { value: 'engine', label: 'Engine' },
  { value: 'catering', label: 'Catering' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'hotel', label: 'Hotel' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'onboard', label: 'Onboard' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_training', label: 'On Training' },
  { value: 'sick_leave', label: 'Sick Leave' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'terminated', label: 'Terminated' },
];

const EMPLOYMENT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' },
  { value: 'probation', label: 'Probation' },
  { value: 'internship', label: 'Internship' },
];

const CURRENCIES = [
  { value: 'USD', label: 'US Dollar (USD)' },
  { value: 'EUR', label: 'Euro (EUR)' },
  { value: 'GBP', label: 'British Pound (GBP)' },
  { value: 'JPY', label: 'Japanese Yen (JPY)' },
  { value: 'AUD', label: 'Australian Dollar (AUD)' },
  { value: 'CAD', label: 'Canadian Dollar (CAD)' },
  { value: 'CHF', label: 'Swiss Franc (CHF)' },
  { value: 'CNY', label: 'Chinese Yuan (CNY)' },
  { value: 'HKD', label: 'Hong Kong Dollar (HKD)' },
  { value: 'SGD', label: 'Singapore Dollar (SGD)' },
];


// File upload handler with progress
const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uploadFile = async (file: File, onProgress?: (progress: number) => void) => {
    setIsUploading(true);
    setError(null);
    
    return new Promise<string>((resolve, reject) => {
      // Simulate file upload with progress
      const totalSize = file.size;
      let uploadedSize = 0;
      const chunkSize = 1024 * 1024; // 1MB chunks
      
      const readChunk = (offset: number) => {
        const reader = new FileReader();
        const blob = file.slice(offset, offset + Math.min(chunkSize, totalSize - offset));
        
        reader.onload = (e) => {
          // In a real app, you would send this chunk to your server
          uploadedSize += (e.loaded as number);
          const progress = Math.round((uploadedSize / totalSize) * 100);
          setUploadProgress(progress);
          if (onProgress) onProgress(progress);
          
          if (uploadedSize < totalSize) {
            readChunk(uploadedSize);
          } else {
            // Simulate server response with file URL
            setTimeout(() => {
              const fileUrl = URL.createObjectURL(file);
              setIsUploading(false);
              resolve(fileUrl);
            }, 500);
          }
        };
        
        reader.onerror = () => {
          const error = new Error('File read error');
          setError('Failed to read file');
          setIsUploading(false);
          reject(error);
        };
        
        reader.readAsArrayBuffer(blob);
      };
      
      readChunk(0);
    });
  };
  
  return { uploadFile, uploadProgress, isUploading, error };
};

export function SeafarerForm({
  initialData = {},
  onSubmit,
  onCancel,
  
}: SeafarerFormProps) {
  const { toast } = useToast();
  // const [activeTab, setActiveTab] = useState('personal');
  // const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  // const [currentDocument, setCurrentDocument] = useState<DocumentType | null>(null);
  // const [isDocumentUploading, setIsDocumentUploading] = useState(false);
  // const [documentUploadProgress, setDocumentUploadProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  // const { uploadFile } = useFileUpload();
  
  // Initialize form with react-hook-form
  const form = useForm<SeafarerFormValues>({
    resolver: zodResolver(seafarerFormSchema),
    defaultValues: useMemo(() => ({
      personalInfo: {
        firstName: initialData?.personalInfo?.firstName || '',
        middleName: initialData?.personalInfo?.middleName || '',
        lastName: initialData?.personalInfo?.lastName || '',
        dateOfBirth: initialData?.personalInfo?.dateOfBirth ? new Date(initialData.personalInfo.dateOfBirth) : new Date(),
        placeOfBirth: initialData?.personalInfo?.placeOfBirth || '',
        nationality: initialData?.personalInfo?.nationality || '',
        gender: (initialData?.personalInfo?.gender as any) || 'prefer_not_to_say',
        maritalStatus: (initialData?.personalInfo?.maritalStatus as any) || 'single',
        bloodType: (initialData?.personalInfo?.bloodType as any) || undefined,
        contact: {
          email: initialData?.personalInfo?.contact?.email || '',
          phone: initialData?.personalInfo?.contact?.phone || '',
          address: {
            street: initialData?.personalInfo?.contact?.address?.street || '',
            city: initialData?.personalInfo?.contact?.address?.city || '',
            state: initialData?.personalInfo?.contact?.address?.state || '',
            postalCode: initialData?.personalInfo?.contact?.address?.postalCode || '',
            country: initialData?.personalInfo?.contact?.address?.country || '',
          },
          emergencyContact: {
            name: initialData?.personalInfo?.contact?.emergencyContact?.name || '',
            relationship: initialData?.personalInfo?.contact?.emergencyContact?.relationship || '',
            phone: initialData?.personalInfo?.contact?.emergencyContact?.phone || '',
            email: initialData?.personalInfo?.contact?.emergencyContact?.email || '',
            address: initialData?.personalInfo?.contact?.emergencyContact?.address || '',
          },
        },
      },
      employment: {
        employeeId: initialData?.employment?.employeeId || `EMP-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
        rank: initialData?.employment?.rank || '',
        department: (initialData?.employment?.department as any) || 'deck',
        status: (initialData?.employment?.status as any) || 'on_leave',
        employmentType: (initialData?.employment?.employmentType as any) || 'permanent',
        joinedDate: initialData?.employment?.joinedDate ? new Date(initialData.employment.joinedDate) : new Date(),
        contractStartDate: initialData?.employment?.contractStartDate ? new Date(initialData.employment.contractStartDate) : new Date(),
        contractEndDate: initialData?.employment?.contractEndDate ? new Date(initialData.employment.contractEndDate) : undefined,
        baseWage: initialData?.employment?.baseWage || 0,
        wageCurrency: initialData?.employment?.wageCurrency || 'USD',
        bankAccount: {
          accountNumber: initialData?.employment?.bankAccount?.accountNumber || '',
          bankName: initialData?.employment?.bankAccount?.bankName || '',
          branch: initialData?.employment?.bankAccount?.branch || '',
          swiftCode: initialData?.employment?.bankAccount?.swiftCode || '',
          iban: initialData?.employment?.bankAccount?.iban || '',
        },
        taxInformation: {
          taxId: initialData?.employment?.taxInformation?.taxId || '',
          taxStatus: initialData?.employment?.taxInformation?.taxStatus || '',
          socialSecurityNumber: initialData?.employment?.taxInformation?.socialSecurityNumber || '',
        },
      },
      documents: initialData?.documents?.map(doc => ({
        ...doc,
        issueDate: doc.issueDate ? new Date(doc.issueDate) : undefined,
        expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : undefined,
      })) || [],
      medicalInfo: {
        bloodGroup: initialData?.medicalInfo?.bloodGroup || '',
        allergies: initialData?.medicalInfo?.allergies || [],
        medicalConditions: initialData?.medicalInfo?.medicalConditions || [],
        lastMedicalCheckup: initialData?.medicalInfo?.lastMedicalCheckup ? new Date(initialData.medicalInfo.lastMedicalCheckup) : undefined,
        nextMedicalCheckup: initialData?.medicalInfo?.nextMedicalCheckup ? new Date(initialData.medicalInfo.nextMedicalCheckup) : undefined,
        notes: initialData?.medicalInfo?.notes || '',
      },
      trainings: initialData?.trainings?.map(training => ({
        ...training,
        issueDate: training.issueDate ? new Date(training.issueDate) : undefined,
        expiryDate: training.expiryDate ? new Date(training.expiryDate) : undefined,
      })) || [],
      emergencyContacts: initialData?.emergencyContacts || [],
      notes: initialData?.notes || '',
    }), [initialData]),
  });

  const { register, watch, formState: { errors }, setValue } = form;
  const employmentType = watch('employment.employmentType');
  
  // Handle form submission
  const onSubmitHandler = async (data: SeafarerFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
      toast({
        title: 'Success',
        description: 'Seafarer information saved successfully',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error saving seafarer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save seafarer information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reusable form field component
  const renderFormField = ({
    label,
    name,
    form,
    render = (field) => (
      <Input
        {...field}
        onChange={(e) => field.onChange(e.target.value)}
      />
    ),
    description,
    className = '',
  }: {
    label: string;
    name: string;
    form: any;
    render?: (field: any) => React.ReactNode;
    description?: string;
    className?: string;
  }) => {
    const fieldState = form.getFieldState(name);
    const fieldError = fieldState.error;
  
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              {render(field)}
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage>{fieldError?.message}</FormMessage>
          </FormItem>
        )}
      />
    );
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmitHandler)} className="space-y-6">
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList>
            <TabsTrigger value="personal">Personal</TabsTrigger>
            <TabsTrigger value="employment">Employment</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="medical">Medical</TabsTrigger>
          </TabsList>

          {/* Personal Information Tab */}
          <TabsContent value="personal" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {renderFormField({
                    label: "First Name *",
                    name: "personalInfo.firstName",
                    form: form,
                  })}
                  {renderFormField({
                    label: "Middle Name",
                    name: "personalInfo.middleName",
                    form: form,
                  })}
                  {renderFormField({
                    label: "Last Name *",
                    name: "personalInfo.lastName",
                    form: form,
                  })}
          </div>
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('personalInfo.dateOfBirth') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {(() => {
                    const dateOfBirth = watch('personalInfo.dateOfBirth');
                    return dateOfBirth ? (
                      format(new Date(dateOfBirth), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    );
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={(() => {
                    const dateOfBirth = watch('personalInfo.dateOfBirth');
                    return dateOfBirth ? new Date(dateOfBirth) : undefined;
                  })()}
                  onSelect={(date) => setValue('personalInfo.dateOfBirth', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="nationality">Nationality *</Label>
            <Input
              id="nationality"
              {...register('personalInfo.nationality')}
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              {...register('personalInfo.contact.email')}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input
              id="phone"
              {...register('personalInfo.contact.phone')}
            />
          </div>
        </CardContent>
        </Card>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="emergencyName">Name *</Label>
            <Input
              id="emergencyName"
              {...register('personalInfo.contact.emergencyContact.name')}
            />
          </div>
          <div>
            <Label htmlFor="emergencyRelationship">Relationship *</Label>
            <Input
              id="emergencyRelationship"
              {...register('personalInfo.contact.emergencyContact.relationship')}
            />
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Phone *</Label>
            <Input
              id="emergencyPhone"
              {...register('personalInfo.contact.emergencyContact.phone')}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Employment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rank">Rank *</Label>
            <Select
              onValueChange={(value) => setValue('employment.rank', value)}
              value={watch('employment.rank')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {RANKS.map((rank) => (
                  <SelectItem key={rank.value} value={rank.value}>
                    {rank.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employment?.rank?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.employment.rank.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="department">Department *</Label>
            <Select
              onValueChange={(value) => setValue('employment.department', value as any)}
              value={watch('employment.department')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                {DEPARTMENTS.map((dept) => (
                  <SelectItem key={dept.value} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="status">Status *</Label>
            <Select
              onValueChange={(value) => setValue('employment.status', value as any)}
              value={watch('employment.status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="employmentType">Employment Type *</Label>
            <Select
              onValueChange={(value) => setValue('employment.employmentType', value as any)}
              value={watch('employment.employmentType')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employment type" />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="joinedDate">Joined Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('employment.joinedDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {(() => {
                    const joinedDate = watch('employment.joinedDate');
                    return joinedDate ? (
                      format(new Date(joinedDate), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    );
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={(() => {
                    const joinedDate = watch('employment.joinedDate');
                    return joinedDate ? new Date(joinedDate) : undefined;
                  })()}
                  onSelect={(date) => setValue('employment.joinedDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          {employmentType === 'contract' && (
            <div>
              <Label htmlFor="contractEndDate">Contract End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !watch('employment.contractEndDate') && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {(() => {
                      const contractEndDate = watch('employment.contractEndDate');
                      return contractEndDate ? (
                        format(new Date(contractEndDate), 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      );
                    })()}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={(() => {
                      const contractEndDate = watch('employment.contractEndDate');
                      return contractEndDate ? new Date(contractEndDate) : undefined;
                    })()}
                    onSelect={(date) => setValue('employment.contractEndDate', date || undefined)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="baseWage">Base Wage *</Label>
              <Input
                id="baseWage"
                type="number"
                step="0.01"
                {...register('employment.baseWage', { valueAsNumber: true })}
              />
            </div>
            <div className="w-32">
              <Label htmlFor="wageCurrency">Currency</Label>
              <Select
                onValueChange={(value) => setValue('employment.wageCurrency', value)}
                value={watch('employment.wageCurrency')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.value} value={currency.value}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button 
          type="submit" 
          className="ocean-gradient shadow-ocean"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : 'Save Seafarer'}
        </Button>
      </div>
    </TabsContent>
    </Tabs>
    </form>
  </Form>
  );
}
