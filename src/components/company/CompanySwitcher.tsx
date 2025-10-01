import React from 'react';
import { useMultiCompany } from '@/context/MultiCompanyContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export const CompanySwitcher: React.FC = () => {
  const { currentCompany, companies, isLoading, setCurrentCompany } = useMultiCompany();

  if (isLoading) {
    return <Skeleton className="h-10 w-48" />;
  }

  if (companies.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No companies available
      </div>
    );
  }

  return (
    <Select
      value={currentCompany?.id || undefined}
      onValueChange={setCurrentCompany}
      disabled={isLoading || companies.length === 0}
    >
      <SelectTrigger className="w-[200px] bg-background">
        <SelectValue placeholder="Select a company" />
      </SelectTrigger>
      <SelectContent>
        {companies.map((company) => (
          <SelectItem key={company.id} value={company.id}>
            {company.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default CompanySwitcher;
