import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CrewAssignment, Seafarer, Vessel, Rank } from '@/lib/schemas_v2';

// Define form schema using Zod
const assignmentFormSchema = z.object({
  seafarerId: z.string().min(1, 'Seafarer is required'),
  vesselId: z.string().min(1, 'Vessel is required'),
  rankId: z.string().min(1, 'Rank is required'),
  startDate: z.date({
    required_error: 'Start date is required',
  }),
  endDate: z.date().optional(),
  status: z.enum(['scheduled', 'active', 'completed', 'cancelled']).default('scheduled'),
  salary: z.number().min(0, 'Salary cannot be negative'),
  currency: z.string().default('USD'),
  rotationType: z.enum(['fixed', 'rotating']).default('fixed'),
  rotationDays: z.number().int().min(1).default(30),
  leaveDays: z.number().int().min(0).default(30),
  notes: z.string().optional(),
});

type AssignmentFormValues = z.infer<typeof assignmentFormSchema>;

interface AssignmentFormProps {
  initialData?: CrewAssignment;
  seafarers?: Seafarer[];
  seafarer?: Seafarer;
  vessels: Vessel[];
  ranks: Rank[];
  onSubmit: (data: AssignmentFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function AssignmentForm({
  initialData,
  seafarers,
  seafarer,
  vessels,
  ranks,
  onSubmit,
  onCancel,
  isSubmitting = false
}: AssignmentFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    setValue,
    watch,
    reset
  } = useForm<AssignmentFormValues>({
    resolver: zodResolver(assignmentFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      startDate: new Date(initialData.startDate),
      endDate: initialData.endDate ? new Date(initialData.endDate) : undefined
    } : {
      seafarerId: seafarer?.id || '',
      vesselId: '',
      rankId: '',
      startDate: new Date(),
      status: 'scheduled',
      salary: 0,
      currency: 'USD',
      rotationType: 'fixed',
      rotationDays: 30,
      leaveDays: 30,
      notes: ''
    }
  });

  // Handle form submission
  const onSubmitHandler = async (data: AssignmentFormValues) => {
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
        <h3 className="text-lg font-medium">Assignment Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Seafarer Selection */}
          {!seafarer && (
            <div>
              <Label htmlFor="seafarerId">Seafarer *</Label>
              <Select
                onValueChange={(value) => setValue('seafarerId', value)}
                value={watch('seafarerId')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select seafarer" />
                </SelectTrigger>
                <SelectContent>
                  {seafarers?.map((s) => (
                    <SelectItem
                      key={s.id}
                      value={s.id}
                    >
                      {`${s.personalInfo.firstName} ${s.personalInfo.lastName}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.seafarerId?.message && (
                <p className="text-sm font-medium text-destructive mt-1">
                  {errors.seafarerId.message}
                </p>
              )}
            </div>
          )}

          {/* Vessel Selection */}
          <div>
            <Label htmlFor="vesselId">Vessel *</Label>
            <Select
              onValueChange={(value) => setValue('vesselId', value)}
              value={watch('vesselId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vessel" />
              </SelectTrigger>
              <SelectContent>
                {vessels.map((vessel) => (
                  <SelectItem key={vessel.id} value={vessel.id}>
                    {vessel.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.vesselId?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.vesselId.message}
              </p>
            )}
          </div>

          {/* Rank Selection */}
          <div>
            <Label htmlFor="rankId">Rank *</Label>
            <Select
              onValueChange={(value) => setValue('rankId', value)}
              value={watch('rankId')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rank" />
              </SelectTrigger>
              <SelectContent>
                {ranks.map((rank) => (
                  <SelectItem key={rank.id} value={rank.id}>
                    {rank.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.rankId?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.rankId.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value: 'scheduled' | 'active' | 'completed' | 'cancelled') => 
                setValue('status', value)
              }
              value={watch('status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Start Date */}
          <div>
            <Label htmlFor="startDate">Start Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('startDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('startDate') ? (
                    format(watch('startDate'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('startDate')}
                  onSelect={(date) => setValue('startDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.startDate?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.startDate.message}
              </p>
            )}
          </div>

          {/* End Date */}
          <div>
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('endDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('endDate') ? (
                    format(watch('endDate'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('endDate')}
                  onSelect={(date) => setValue('endDate', date || undefined)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Salary */}
          <div>
            <Label htmlFor="salary">Salary *</Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5">$</span>
              <Input
                id="salary"
                type="number"
                step="0.01"
                className="pl-8"
                {...register('salary', { valueAsNumber: true })}
              />
            </div>
            {errors.salary?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.salary.message}
              </p>
            )}
          </div>

          {/* Currency */}
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select
              onValueChange={(value) => setValue('currency', value)}
              value={watch('currency')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
                <SelectItem value="JPY">JPY (¥)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rotation Type */}
          <div>
            <Label htmlFor="rotationType">Rotation Type</Label>
            <Select
              onValueChange={(value: 'fixed' | 'rotating') => 
                setValue('rotationType', value)
              }
              value={watch('rotationType')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rotation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="rotating">Rotating</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Rotation Days */}
          <div>
            <Label htmlFor="rotationDays">Rotation Days</Label>
            <Input
              id="rotationDays"
              type="number"
              min="1"
              {...register('rotationDays', { valueAsNumber: true })}
            />
            {errors.rotationDays?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.rotationDays.message}
              </p>
            )}
          </div>

          {/* Leave Days */}
          <div>
            <Label htmlFor="leaveDays">Leave Days</Label>
            <Input
              id="leaveDays"
              type="number"
              min="0"
              {...register('leaveDays', { valueAsNumber: true })}
            />
            {errors.leaveDays?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.leaveDays.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this assignment"
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
          {isLoading ? 'Saving...' : 'Save Assignment'}
        </Button>
      </div>
    </form>
  );
}
