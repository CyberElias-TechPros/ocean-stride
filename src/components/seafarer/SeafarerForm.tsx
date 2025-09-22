import { useState, useEffect } from 'react';
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

// Define form schema using Zod
const seafarerFormSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    dateOfBirth: z.string().or(z.date()),
    nationality: z.string().min(1, 'Nationality is required'),
    contact: z.object({
      email: z.string().email('Invalid email address'),
      phone: z.string().min(1, 'Phone number is required'),
      emergencyContact: z.object({
        name: z.string().min(1, 'Emergency contact name is required'),
        relationship: z.string().min(1, 'Relationship is required'),
        phone: z.string().min(1, 'Emergency contact phone is required'),
      }),
    }),
  }),
  employment: z.object({
    rank: z.string().min(1, 'Rank is required'),
    department: z.enum(['deck', 'engine', 'catering', 'electrical', 'other']),
    status: z.enum(['onboard', 'on_leave', 'on_training', 'inactive']),
    baseWage: z.number().min(0, 'Base wage must be a positive number'),
    wageCurrency: z.string().min(1, 'Currency is required'),
    employmentType: z.enum(['permanent', 'contract', 'temporary']),
    joinedDate: z.string().or(z.date()),
    contractEndDate: z.string().or(z.date()).optional(),
  }),
});

type SeafarerFormValues = z.infer<typeof seafarerFormSchema>;

interface SeafarerFormProps {
  initialData?: Seafarer;
  onSubmit: (data: SeafarerFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const RANKS = [
  'Captain', 'Chief Officer', 'Second Officer', 'Third Officer',
  'Chief Engineer', 'Second Engineer', 'Third Engineer', 'Fourth Engineer',
  'Bosun', 'Able Seaman', 'Ordinary Seaman', 'Cook', 'Steward'
];

const DEPARTMENTS = [
  { value: 'deck', label: 'Deck' },
  { value: 'engine', label: 'Engine' },
  { value: 'catering', label: 'Catering' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'other', label: 'Other' }
];

const STATUS_OPTIONS = [
  { value: 'onboard', label: 'Onboard' },
  { value: 'on_leave', label: 'On Leave' },
  { value: 'on_training', label: 'On Training' },
  { value: 'inactive', label: 'Inactive' }
];

const EMPLOYMENT_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
  { value: 'temporary', label: 'Temporary' }
];

const CURRENCIES = [
  { value: 'USD', label: 'USD ($)' },
  { value: 'EUR', label: 'EUR (€)' },
  { value: 'GBP', label: 'GBP (£)' },
  { value: 'JPY', label: 'JPY (¥)' },
  { value: 'SGD', label: 'SGD (S$)' }
];

export function SeafarerForm({ 
  initialData, 
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: SeafarerFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const defaultValues: Partial<SeafarerFormValues> = {
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: new Date(),
      nationality: '',
      contact: {
        email: '',
        phone: '',
        emergencyContact: {
          name: '',
          relationship: '',
          phone: ''
        }
      }
    },
    employment: {
      rank: '',
      department: 'deck',
      status: 'on_leave',
      baseWage: 0,
      wageCurrency: 'USD',
      employmentType: 'permanent',
      joinedDate: new Date(),
      contractEndDate: undefined
    }
  };
  
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<SeafarerFormValues>({
    resolver: zodResolver(seafarerFormSchema),
    defaultValues: initialData ? {
      personalInfo: {
        firstName: initialData.personalInfo.firstName,
        lastName: initialData.personalInfo.lastName,
        dateOfBirth: initialData.personalInfo.dateOfBirth,
        nationality: initialData.personalInfo.nationality,
        contact: {
          email: initialData.personalInfo.contact.email,
          phone: initialData.personalInfo.contact.phone,
          emergencyContact: {
            name: initialData.personalInfo.contact.emergencyContact?.name || '',
            relationship: initialData.personalInfo.contact.emergencyContact?.relationship || '',
            phone: initialData.personalInfo.contact.emergencyContact?.phone || ''
          }
        }
      },
      employment: {
        rank: initialData.employment.rank,
        department: initialData.employment.department,
        status: initialData.employment.status,
        baseWage: initialData.employment.baseWage,
        wageCurrency: initialData.employment.wageCurrency,
        employmentType: initialData.employment.employmentType,
        joinedDate: initialData.employment.joinedDate,
        contractEndDate: initialData.employment.contractEndDate
      }
    } : defaultValues
  });
  
  // Watch values for conditional rendering
  const employmentType = watch('employment.employmentType');
  
  // Handle form submission
  const onSubmitHandler = async (data: SeafarerFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName">First Name *</Label>
            <Input 
              id="firstName" 
              {...register('personalInfo.firstName')} 
              error={errors.personalInfo?.firstName?.message}
            />
          </div>
          <div>
            <Label htmlFor="lastName">Last Name *</Label>
            <Input 
              id="lastName" 
              {...register('personalInfo.lastName')} 
              error={errors.personalInfo?.lastName?.message}
            />
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
                  {watch('personalInfo.dateOfBirth') ? (
                    format(new Date(watch('personalInfo.dateOfBirth')), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(watch('personalInfo.dateOfBirth'))}
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
              error={errors.personalInfo?.nationality?.message}
            />
          </div>
          <div>
            <Label htmlFor="email">Email *</Label>
            <Input 
              id="email" 
              type="email" 
              {...register('personalInfo.contact.email')} 
              error={errors.personalInfo?.contact?.email?.message}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone *</Label>
            <Input 
              id="phone" 
              {...register('personalInfo.contact.phone')} 
              error={errors.personalInfo?.contact?.phone?.message}
            />
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Emergency Contact</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="emergencyName">Name *</Label>
            <Input 
              id="emergencyName" 
              {...register('personalInfo.contact.emergencyContact.name')} 
              error={errors.personalInfo?.contact?.emergencyContact?.name?.message}
            />
          </div>
          <div>
            <Label htmlFor="emergencyRelationship">Relationship *</Label>
            <Input 
              id="emergencyRelationship" 
              {...register('personalInfo.contact.emergencyContact.relationship')} 
              error={errors.personalInfo?.contact?.emergencyContact?.relationship?.message}
            />
          </div>
          <div>
            <Label htmlFor="emergencyPhone">Phone *</Label>
            <Input 
              id="emergencyPhone" 
              {...register('personalInfo.contact.emergencyContact.phone')} 
              error={errors.personalInfo?.contact?.emergencyContact?.phone?.message}
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
                  <SelectItem key={rank} value={rank}>
                    {rank}
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
                  {watch('employment.joinedDate') ? (
                    format(new Date(watch('employment.joinedDate')), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={new Date(watch('employment.joinedDate'))}
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
                    {watch('employment.contractEndDate') ? (
                      format(new Date(watch('employment.contractEndDate')), 'PPP')
                    ) : (
                      <span>Pick a date</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={watch('employment.contractEndDate') ? new Date(watch('employment.contractEndDate')) : undefined}
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
                error={errors.employment?.baseWage?.message}
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
    </form>
  );
}
