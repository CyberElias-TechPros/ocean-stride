'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/data-display/DataTable';
import { useAssignments } from '@/hooks/queries/useAssignmentQueries';
import { useVessels } from '@/hooks/queries/useVesselQueries';
import { useSeafarers } from '@/hooks/queries/useSeafarerQueries';
import { useRanks } from '@/hooks/queries/useRankQueries';
import { AssignmentForm } from '@/components/assignment/AssignmentForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export default function AssignmentsPage() {
  const router = useRouter();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<string | null>(null);

  // Fetch data
  const { data: assignments = [], isLoading } = useAssignments({});
  const { data: vessels = [] } = useVessels();
  const { data: seafarers = [] } = useSeafarers();
  const { data: ranks = [] } = useRanks();

  // Handle assignment selection
  const handleRowClick = (id: string) => {
    setSelectedAssignment(id);
    setIsDialogOpen(true);
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setSelectedAssignment(null);
  };

  // Handle form submission
  const handleSubmit = async (data: any) => {
    // This would be handled by the form component
    console.log('Form submitted:', data);
    handleDialogClose();
  };

  // Define columns for the data table
  const columns = [
    {
      accessorKey: 'seafarerName',
      header: 'Seafarer',
      cell: ({ row }: any) => {
        const seafarer = seafarers.find(s => s.id === row.original.seafarerId);
        return seafarer ? `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}` : 'N/A';
      },
    },
    {
      accessorKey: 'vesselName',
      header: 'Vessel',
      cell: ({ row }: any) => {
        const vessel = vessels.find(v => v.id === row.original.vesselId);
        return vessel ? vessel.name : 'N/A';
      },
    },
    {
      accessorKey: 'rank',
      header: 'Rank',
      cell: ({ row }: any) => {
        const rank = ranks.find(r => r.id === row.original.rankId);
        return rank ? rank.name : 'N/A';
      },
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }: any) => new Date(row.original.startDate).toLocaleDateString(),
    },
    {
      accessorKey: 'endDate',
      header: 'End Date',
      cell: ({ row }: any) => 
        row.original.endDate ? new Date(row.original.endDate).toLocaleDateString() : 'Ongoing',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: any) => {
        const status = row.original.status;
        const statusColors: Record<string, string> = {
          active: 'bg-green-100 text-green-800',
          completed: 'bg-blue-100 text-blue-800',
          cancelled: 'bg-red-100 text-red-800',
          scheduled: 'bg-yellow-100 text-yellow-800',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[status] || 'bg-gray-100'}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      },
    },
  ];

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Crew Assignments</h1>
        <Button onClick={() => {
          setSelectedAssignment(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" />
          New Assignment
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={assignments}
        isLoading={isLoading}
        onRowClick={(row) => handleRowClick(row.id)}
        searchPlaceholder="Search assignments..."
      />

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedAssignment ? 'Edit Assignment' : 'New Assignment'}
            </DialogTitle>
          </DialogHeader>
          <AssignmentForm
            initialData={selectedAssignment ? assignments.find(a => a.id === selectedAssignment) : undefined}
            seafarers={seafarers}
            vessels={vessels}
            ranks={ranks}
            onSubmit={handleSubmit}
            onCancel={handleDialogClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
