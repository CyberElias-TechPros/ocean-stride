import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { CalendarIcon, FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Certificate } from '@/lib/schemas_v2';

// Define form schema using Zod
const certificateFormSchema = z.object({
  type: z.string().min(1, 'Certificate type is required'),
  number: z.string().min(1, 'Certificate number is required'),
  issueDate: z.date({
    required_error: 'Issue date is required',
  }),
  expiryDate: z.date({
    required_error: 'Expiry date is required',
  }),
  issuedBy: z.string().min(1, 'Issuing authority is required'),
  fileUrl: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['valid', 'expired', 'expiring_soon', 'missing']).default('valid'),
  requiredForRanks: z.array(z.string()).default([]),
});

type CertificateFormValues = z.infer<typeof certificateFormSchema>;

interface CertificateFormProps {
  initialData?: Certificate;
  seafarerId: string;
  onSubmit: (data: CertificateFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const CERTIFICATE_TYPES = [
  'Certificate of Competency (CoC)',
  'Endorsement of Recognition (EoR)',
  'Basic Safety Training (BST)',
  'Advanced Fire Fighting (AFF)',
  'Proficiency in Survival Craft (PSC)',
  'Medical First Aid (MFA)',
  'Medical Care (MC)',
  'Security Training for Seafarers (STS)',
  'GMDSS General Operator\'s Certificate (GOC)',
  'ECDIS',
  'Tanker Familiarization',
  'Crowd Management',
  'Crisis Management',
  'Passport',
  'Seaman\'s Book',
  'Visa',
  'Other'
];

export function CertificateForm({ 
  initialData, 
  seafarerId,
  onSubmit, 
  onCancel, 
  isSubmitting = false 
}: CertificateFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<CertificateFormValues>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      issueDate: new Date(initialData.issueDate),
      expiryDate: new Date(initialData.expiryDate)
    } : {
      type: '',
      number: '',
      issueDate: new Date(),
      expiryDate: new Date(),
      issuedBy: '',
      fileUrl: '',
      notes: '',
      status: 'valid',
      requiredForRanks: []
    }
  });
  
  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      // In a real app, you would upload the file to a storage service here
      // and get back a URL to store in the database
      // For now, we'll just store a placeholder
      setValue('fileUrl', selectedFile.name);
    }
  };
  
  // Handle form submission
  const onSubmitHandler = async (data: CertificateFormValues) => {
    try {
      setIsLoading(true);
      
      // In a real app, you would upload the file here and get a URL
      if (file) {
        // const fileUrl = await uploadFile(file);
        // data.fileUrl = fileUrl;
      }
      
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Certificate Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="type">Certificate Type *</Label>
            <Select
              onValueChange={(value) => setValue('type', value)}
              value={watch('type')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select certificate type" />
              </SelectTrigger>
              <SelectContent>
                {CERTIFICATE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.type?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.type.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="number">Certificate Number *</Label>
            <div>
              <Input 
                id="number" 
                {...register('number')} 
              />
              {errors.number?.message && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {errors.number.message}
                </p>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="issueDate">Issue Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('issueDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('issueDate') ? (
                    format(watch('issueDate'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('issueDate')}
                  onSelect={(date) => setValue('issueDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.issueDate?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.issueDate.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="expiryDate">Expiry Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('expiryDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('expiryDate') ? (
                    format(watch('expiryDate'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('expiryDate')}
                  onSelect={(date) => setValue('expiryDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.expiryDate?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.expiryDate.message}
              </p>
            )}
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="issuedBy">Issued By *</Label>
            <div>
              <Input 
                id="issuedBy" 
                {...register('issuedBy')} 
              />
              {errors.issuedBy?.message && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {errors.issuedBy.message}
                </p>
              )}
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="file">Document (PDF, JPG, PNG)</Label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
              <div className="space-y-1 text-center">
                <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                <div className="flex text-sm text-muted-foreground">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-background rounded-md font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                  >
                    <span>Upload a file</span>
                    <input 
                      id="file-upload" 
                      name="file-upload" 
                      type="file" 
                      className="sr-only" 
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                  </label>
                  <p className="pl-1">or drag and drop</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  {file ? file.name : 'PDF, JPG, PNG up to 10MB'}
                </p>
              </div>
            </div>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input 
              id="notes" 
              {...register('notes')} 
              placeholder="Any additional notes about this certificate"
            />
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
          {isLoading ? 'Saving...' : 'Save Certificate'}
        </Button>
      </div>
    </form>
  );
}
