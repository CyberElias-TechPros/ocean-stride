import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useZodForm } from '@/hooks/useZodForm';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';

const vesselFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  imoNumber: z.string().regex(/^\d{7}$/, 'IMO number must be 7 digits'),
  type: z.enum(['cargo', 'tanker', 'fishing', 'passenger', 'offshore', 'naval', 'yacht', 'other']),
  flag: z.string().min(2, 'Flag must be at least 2 characters'),
  yearBuilt: z.number().int().min(1900, 'Year must be at least 1900').max(new Date().getFullYear() + 1, 'Year cannot be in the future'),
  grossTonnage: z.number().positive('Gross tonnage must be positive').optional(),
  deadweight: z.number().positive('Deadweight must be positive').optional(),
  callSign: z.string().max(10, 'Call sign must be at most 10 characters').optional(),
  mmsi: z.string().regex(/^[0-9]{9}$/, 'MMSI must be 9 digits').optional(),
  status: z.enum(['active', 'inactive', 'maintenance', 'drydock', 'scrapped']).default('active'),
});

type VesselFormValues = z.infer<typeof vesselFormSchema>;

interface AddVesselDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: VesselFormValues) => Promise<void>;
  isLoading: boolean;
}

export function AddVesselDialog({ open, onOpenChange, onSubmit, isLoading }: AddVesselDialogProps) {
  const form = useZodForm({
    schema: vesselFormSchema,
    defaultValues: {
      name: '',
      imoNumber: '',
      type: 'cargo',
      flag: '',
      yearBuilt: new Date().getFullYear(),
      grossTonnage: undefined,
      deadweight: undefined,
      callSign: '',
      mmsi: '',
      status: 'active',
    },
  });

  const handleSubmit = async (data: VesselFormValues) => {
    try {
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      // Error handling is done by the parent component
    }
  };

  const vesselTypes = [
    { value: 'cargo', label: 'Cargo' },
    { value: 'tanker', label: 'Tanker' },
    { value: 'fishing', label: 'Fishing' },
    { value: 'passenger', label: 'Passenger' },
    { value: 'offshore', label: 'Offshore' },
    { value: 'naval', label: 'Naval' },
    { value: 'yacht', label: 'Yacht' },
    { value: 'other', label: 'Other' },
  ];

  const vesselStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'drydock', label: 'Drydock' },
    { value: 'scrapped', label: 'Scrapped' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vessel</DialogTitle>
          <DialogDescription>
            Enter vessel information to add it to the fleet
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Vessel Name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="imoNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IMO Number *</FormLabel>
                    <FormControl>
                      <Input placeholder="1234567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select vessel type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vesselTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flag"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Flag *</FormLabel>
                    <FormControl>
                      <Input placeholder="Country flag" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="yearBuilt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Built *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="2020"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="grossTonnage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gross Tonnage</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="50000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="deadweight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadweight</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="80000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="callSign"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Call Sign</FormLabel>
                    <FormControl>
                      <Input placeholder="ABC123" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mmsi"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MMSI</FormLabel>
                    <FormControl>
                      <Input placeholder="123456789" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {vesselStatuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Vessel'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}