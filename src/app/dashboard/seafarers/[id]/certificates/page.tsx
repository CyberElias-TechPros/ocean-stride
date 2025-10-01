'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, Download, Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-display/DataTable';
import { useSeafarer } from '@/hooks/queries/useSeafarerQueries';
import { useCertificates, useCreateCertificate, useDeleteCertificate } from '@/hooks/queries/useCertificateQueries';
import { Certificate } from '@/lib/schemas_v2';
import { format } from 'date-fns';
import { toast } from '@/components/ui/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SeafarerCertificatesPage() {
  const { id } = useParams();
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [deleteCertificateId, setDeleteCertificateId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type: '',
    number: '',
    issueDate: new Date(),
    expiryDate: new Date(),
    issuedBy: '',
    notes: '',
  });

  // Fetch data
  const { data: seafarer, isLoading: isLoadingSeafarer } = useSeafarer(id as string);
  const { data: certificates = [], isLoading: isLoadingCertificates } = useCertificates(id as string);
  const createCertificate = useCreateCertificate();
  const deleteCertificate = useDeleteCertificate();

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle date changes
  const handleDateChange = (name: string, date: Date | undefined) => {
    if (date) {
      setFormData(prev => ({
        ...prev,
        [name]: date,
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    
    try {
      // In a real app, you would upload the file to a storage service
      // and get the file URL before creating the certificate
      const fileUrl = selectedFile ? URL.createObjectURL(selectedFile) : '';
      
      await createCertificate.mutateAsync({
        seafarerId: id as string,
        ...formData,
        fileUrl,
      });
      
      toast({
        title: 'Success',
        description: 'Certificate added successfully',
      });
      
      setIsDialogOpen(false);
      setFormData({
        type: '',
        number: '',
        issueDate: new Date(),
        expiryDate: new Date(),
        issuedBy: '',
        notes: '',
      });
      setSelectedFile(null);
    } catch (error) {
      console.error('Error adding certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to add certificate',
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Handle certificate deletion
  const handleDelete = async () => {
    if (!deleteCertificateId) return;
    
    try {
      await deleteCertificate.mutateAsync(deleteCertificateId);
      toast({
        title: 'Success',
        description: 'Certificate deleted successfully',
      });
      setDeleteCertificateId(null);
    } catch (error) {
      console.error('Error deleting certificate:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete certificate',
        variant: 'destructive',
      });
    }
  };

  // Define columns for the data table
  const columns = [
    {
      accessorKey: 'type',
      header: 'Certificate Type',
    },
    {
      accessorKey: 'number',
      header: 'Certificate Number',
    },
    {
      accessorKey: 'issueDate',
      header: 'Issue Date',
      cell: ({ row }: any) => format(new Date(row.original.issueDate), 'PP'),
    },
    {
      accessorKey: 'expiryDate',
      header: 'Expiry Date',
      cell: ({ row }: any) => {
        const expiryDate = new Date(row.original.expiryDate);
        const isExpired = expiryDate < new Date();
        const isExpiringSoon = new Date(expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div className="flex items-center">
            <span className={cn(
              isExpired ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-green-600',
              'font-medium'
            )}>
              {format(expiryDate, 'PP')}
            </span>
            {isExpired && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full">
                Expired
              </span>
            )}
            {isExpiringSoon && !isExpired && (
              <span className="ml-2 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full">
                Expiring Soon
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'issuedBy',
      header: 'Issued By',
    },
    {
      id: 'actions',
      cell: ({ row }: any) => (
        <div className="flex space-x-2">
          {row.original.fileUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(row.original.fileUrl, '_blank')}
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-800"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteCertificateId(row.original.id);
            }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ];

  if (isLoadingSeafarer) {
    return <div>Loading seafarer data...</div>;
  }

  if (!seafarer) {
    return <div>Seafarer not found</div>;
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">
            {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}'s Certificates
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage certificates and documents for {seafarer.personalInfo.firstName}
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Certificate
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={certificates}
        isLoading={isLoadingCertificates}
        searchKey="number"
        pageSize={10}
      />

      {/* Add Certificate Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Certificate</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="type">Certificate Type *</Label>
                <Input
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="number">Certificate Number *</Label>
                <Input
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Issue Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.issueDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.issueDate ? (
                        format(formData.issueDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.issueDate}
                      onSelect={(date) => handleDateChange('issueDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Expiry Date *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !formData.expiryDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.expiryDate ? (
                        format(formData.expiryDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={formData.expiryDate}
                      onSelect={(date) => handleDateChange('expiryDate', date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="issuedBy">Issued By *</Label>
                <Input
                  id="issuedBy"
                  name="issuedBy"
                  value={formData.issuedBy}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file">Certificate File (PDF/Image) *</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    required
                  />
                  {selectedFile && (
                    <span className="text-sm text-muted-foreground">
                      {selectedFile.name}
                    </span>
                  )}
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isUploading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading}>
                {isUploading ? 'Saving...' : 'Save Certificate'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteCertificateId} onOpenChange={(open) => !open && setDeleteCertificateId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Certificate</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete this certificate? This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteCertificateId(null)}
              disabled={deleteCertificate.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteCertificate.isPending}
            >
              {deleteCertificate.isPending ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
