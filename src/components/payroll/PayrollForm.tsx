import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { CalendarIcon, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Payroll, PayrollItem, Seafarer, Vessel } from '@/lib/schemas_v2';
import { z } from 'zod';

// Define form schema using Zod
const payrollFormSchema = z.object({
  seafarerId: z.string().min(1, 'Seafarer is required'),
  vesselId: z.string().min(1, 'Vessel is required'),
  periodStart: z.date({
    required_error: 'Period start date is required',
  }),
  periodEnd: z.date({
    required_error: 'Period end date is required',
  }),
  paymentDate: z.date({
    required_error: 'Payment date is required',
  }),
  status: z.enum(['draft', 'pending', 'approved', 'paid', 'cancelled']).default('draft'),
  paymentMethod: z.enum(['bank_transfer', 'cash', 'check']).default('bank_transfer'),
  items: z.array(z.object({
    type: z.enum(['regular', 'overtime', 'bonus', 'allowance', 'deduction', 'tax', 'pension']),
    description: z.string().min(1, 'Description is required'),
    amount: z.number().min(0.01, 'Amount must be greater than 0'),
    rate: z.number().min(0).optional(),
    quantity: z.number().min(0).default(1),
    taxable: z.boolean().default(true)
  })).min(1, 'At least one payroll item is required'),
  notes: z.string().optional(),
});

type PayrollFormValues = z.infer<typeof payrollFormSchema>;

interface PayrollFormProps {
  initialData?: Payroll;
  seafarers?: Seafarer[];
  seafarer?: Seafarer;
  vessels: Vessel[];
  onSubmit: (data: PayrollFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

export function PayrollForm({
  initialData,
  seafarers,
  seafarer,
  vessels,
  onSubmit,
  onCancel,
  isSubmitting = false
}: PayrollFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize form with react-hook-form
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors },
    setValue,
    watch,
  } = useForm<PayrollFormValues>({
    resolver: zodResolver(payrollFormSchema),
    defaultValues: initialData ? {
      ...initialData,
      periodStart: new Date(initialData.periodStart),
      periodEnd: new Date(initialData.periodEnd),
      paymentDate: initialData.paymentDate ? new Date(initialData.paymentDate) : new Date(),
      items: initialData.items || [],
    } : {
      seafarerId: seafarer?.id || '',
      vesselId: '',
      periodStart: new Date(),
      periodEnd: new Date(),
      paymentDate: new Date(),
      status: 'draft',
      paymentMethod: 'bank_transfer',
      items: [{
        type: 'regular',
        description: 'Base Salary',
        amount: 0,
        taxable: true,
        quantity: 1
      }],
      notes: ''
    }
  });

  // Initialize field array for payroll items
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  // Calculate total amount
  const calculateTotal = () => {
    return fields.reduce((sum, _, index) => {
      const amount = watch(`items.${index}.amount`) || 0;
      const quantity = watch(`items.${index}.quantity`) || 1;
      return sum + (amount * quantity);
    }, 0);
  };

  // Handle form submission
  const onSubmitHandler = async (data: PayrollFormValues) => {
    try {
      setIsLoading(true);
      await onSubmit(data);
    } finally {
      setIsLoading(false);
    }
  };

  // Add a new payroll item
  const addPayrollItem = () => {
    append({
      type: 'regular',
      description: '',
      amount: 0,
      taxable: true,
      quantity: 1
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payroll Details</h3>
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
                    <SelectItem key={s.id} value={s.id}>
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

          {/* Period Start Date */}
          <div>
            <Label htmlFor="periodStart">Period Start *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('periodStart') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('periodStart') ? (
                    format(watch('periodStart'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('periodStart')}
                  onSelect={(date) => setValue('periodStart', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.periodStart?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.periodStart.message}
              </p>
            )}
          </div>

          {/* Period End Date */}
          <div>
            <Label htmlFor="periodEnd">Period End *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('periodEnd') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('periodEnd') ? (
                    format(watch('periodEnd'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('periodEnd')}
                  onSelect={(date) => setValue('periodEnd', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.periodEnd?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.periodEnd.message}
              </p>
            )}
          </div>

          {/* Payment Date */}
          <div>
            <Label htmlFor="paymentDate">Payment Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watch('paymentDate') && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watch('paymentDate') ? (
                    format(watch('paymentDate'), 'PPP')
                  ) : (
                    <span>Pick a date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={watch('paymentDate')}
                  onSelect={(date) => setValue('paymentDate', date || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.paymentDate?.message && (
              <p className="text-sm font-medium text-destructive mt-1">
                {errors.paymentDate.message}
              </p>
            )}
          </div>

          {/* Status */}
          <div>
            <Label htmlFor="status">Status</Label>
            <Select
              onValueChange={(value: 'draft' | 'pending' | 'approved' | 'paid' | 'cancelled') => 
                setValue('status', value)
              }
              value={watch('status')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div>
            <Label htmlFor="paymentMethod">Payment Method</Label>
            <Select
              onValueChange={(value: 'bank_transfer' | 'cash' | 'check') => 
                setValue('paymentMethod', value)
              }
              value={watch('paymentMethod')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Payroll Items */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h4 className="text-md font-medium">Payroll Items</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addPayrollItem}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </div>

          {fields.map((item, index) => (
            <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 border rounded-lg">
              <div className="md:col-span-3">
                <Label>Type</Label>
                <Select
                  onValueChange={(value: any) => setValue(`items.${index}.type`, value)}
                  value={watch(`items.${index}.type`)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Pay</SelectItem>
                    <SelectItem value="overtime">Overtime</SelectItem>
                    <SelectItem value="bonus">Bonus</SelectItem>
                    <SelectItem value="allowance">Allowance</SelectItem>
                    <SelectItem value="deduction">Deduction</SelectItem>
                    <SelectItem value="tax">Tax</SelectItem>
                    <SelectItem value="pension">Pension</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="md:col-span-4">
                <Label>Description</Label>
                <Input
                  {...register(`items.${index}.description`)}
                  placeholder="Description"
                />
                {errors.items?.[index]?.description?.message && (
                  <p className="text-sm font-medium text-destructive mt-1">
                    {errors.items?.[index]?.description?.message}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-1">
                <Label>Rate</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register(`items.${index}.rate`, { valueAsNumber: true })}
                  placeholder="0.00"
                />
              </div>
              
              <div className="md:col-span-1">
                <Label>Qty</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                  placeholder="1"
                />
              </div>
              
              <div className="md:col-span-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  {...register(`items.${index}.amount`, { valueAsNumber: true })}
                  placeholder="0.00"
                />
                {errors.items?.[index]?.amount?.message && (
                  <p className="text-sm font-medium text-destructive mt-1">
                    {errors.items?.[index]?.amount?.message}
                  </p>
                )}
              </div>
              
              <div className="md:col-span-1 flex items-end">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`items.${index}.taxable`}
                    {...register(`items.${index}.taxable`)}
                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor={`items.${index}.taxable`}>Taxable</Label>
                </div>
              </div>
              
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(index)}
                  className="text-destructive hover:text-destructive/80"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          
          {errors.items?.message && (
            <p className="text-sm font-medium text-destructive">
              {errors.items.message}
            </p>
          )}
          
          {/* Total */}
          <div className="flex justify-end pt-2">
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-2xl font-bold">
                ${calculateTotal().toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="pt-4">
          <Label htmlFor="notes">Notes</Label>
          <Input
            id="notes"
            {...register('notes')}
            placeholder="Any additional notes about this payroll"
          />
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
          {isLoading ? 'Saving...' : 'Save Payroll'}
        </Button>
      </div>
    </form>
  );
}
