import { useState } from 'react';
import { Plus, Building2, Settings, Users, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useCompany } from '@/context/CompanyContext';
import { Company } from '@/lib/database';

export function CompanySelector() {
  const { companies, selectedCompany, setSelectedCompany } = useCompany();
  const [showAll, setShowAll] = useState(false);

  const displayedCompanies = showAll ? companies : companies.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Select Company</h2>
          <p className="text-muted-foreground">
            Choose which company's operations you want to manage
          </p>
        </div>
        <Button className="flex items-center space-x-2">
          <Plus className="w-4 h-4" />
          <span>Add Company</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedCompanies.map((company) => (
          <CompanyCard
            key={company.id}
            company={company}
            isSelected={selectedCompany?.id === company.id}
            onSelect={() => setSelectedCompany(company)}
          />
        ))}
      </div>

      {companies.length > 3 && (
        <div className="text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? 'Show Less' : `Show All ${companies.length} Companies`}
          </Button>
        </div>
      )}
    </div>
  );
}

interface CompanyCardProps {
  company: Company;
  isSelected: boolean;
  onSelect: () => void;
}

function CompanyCard({ company, isSelected, onSelect }: CompanyCardProps) {
  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-lg ${
        isSelected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{company.name}</CardTitle>
              <Badge variant="outline" className="mt-1">
                {company.code}
              </Badge>
            </div>
          </div>
          {isSelected && (
            <Badge className="bg-success text-success-foreground">
              Active
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <CardDescription className="text-sm text-muted-foreground">
          Maritime operations management for {company.name}
        </CardDescription>

        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm">
            <MapPin className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              {company.address.city}, {company.address.country}
            </span>
          </div>
          
          <div className="flex items-center space-x-2 text-sm">
            <Users className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground">
              Active crew management
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-muted-foreground">
            Currency: {company.settings.currency}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-1 h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/settings';
            }}
          >
            <Settings className="w-3 h-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}