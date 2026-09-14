import React, { useState } from 'react';
import { Plus, Search, Filter, Users, Award, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { useCompanies } from '@/hooks/queries/useCompanyQueries';
import { DatabaseServiceV2 } from '@/lib/database_v2';
import { STORE_NAMES, Seafarer } from '@/lib/schemas_v2';
import { useQuery } from '@tanstack/react-query';
import { useCertificates } from '@/hooks/queries/useCertificateQueries';

const db = DatabaseServiceV2.getInstance();

function SeafarerCard({ seafarer }: { seafarer: Seafarer }) {
  const { data: certificates = [] } = useCertificates({ seafarerId: seafarer.id });
  
  const expiringCerts = certificates.filter(cert => cert.status === 'expiring_soon').length;
  const expiredCerts = certificates.filter(cert => cert.status === 'expired').length;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'onboard':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'on_leave':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'on_training':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start gap-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={seafarer.personalInfo.photoUrl} />
            <AvatarFallback>
              {seafarer.personalInfo.firstName[0]}{seafarer.personalInfo.lastName[0]}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 space-y-1">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {seafarer.personalInfo.firstName} {seafarer.personalInfo.lastName}
              </CardTitle>
              <Badge className={getStatusColor(seafarer.employment.status)}>
                {seafarer.employment.status.replace('_', ' ')}
              </Badge>
            </div>
            
            <CardDescription>
              {seafarer.employment.rank} • {seafarer.personalInfo.nationality}
            </CardDescription>
            
            {seafarer.employment.currentVesselName && (
              <p className="text-sm text-muted-foreground">
                📍 Currently on {seafarer.employment.currentVesselName}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Department</p>
              <p className="font-medium capitalize">{seafarer.employment.department}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Base Wage</p>
              <p className="font-medium">
                {seafarer.employment.wageCurrency} {seafarer.employment.baseWage.toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Certificate Status</span>
              <span className="text-xs">
                {certificates.length} total
              </span>
            </div>
            
            <div className="space-y-1">
              {expiredCerts > 0 && (
                <div className="flex items-center gap-2 text-xs text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full" />
                  {expiredCerts} expired
                </div>
              )}
              {expiringCerts > 0 && (
                <div className="flex items-center gap-2 text-xs text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                  {expiringCerts} expiring soon
                </div>
              )}
              {expiredCerts === 0 && expiringCerts === 0 && (
                <div className="flex items-center gap-2 text-xs text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full" />
                  All certificates current
                </div>
              )}
            </div>
            
            <Progress 
              value={Math.max(0, 100 - ((expiredCerts + expiringCerts) / certificates.length * 100))} 
              className="h-2"
            />
          </div>
          
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" className="flex-1">
              <FileText className="h-4 w-4 mr-1" />
              View Profile
            </Button>
            <Button variant="outline" size="sm" className="flex-1">
              <Award className="h-4 w-4 mr-1" />
              Certificates
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SeafarerManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  const { data: companies = [] } = useCompanies();
  
  const { data: seafarers = [], isLoading } = useQuery({
    queryKey: ['seafarers', searchTerm, selectedCompany, selectedStatus, selectedDepartment],
    queryFn: async () => {
      await db.init();
      let results = await db.getAll<Seafarer>(STORE_NAMES.SEAFARERS);
      
      // Apply filters
      if (selectedCompany !== 'all') {
        results = results.filter(s => s.companyId === selectedCompany);
      }
      if (selectedStatus !== 'all') {
        results = results.filter(s => s.employment.status === selectedStatus);
      }
      if (selectedDepartment !== 'all') {
        results = results.filter(s => s.employment.department === selectedDepartment);
      }
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        results = results.filter(s => 
          s.personalInfo.firstName.toLowerCase().includes(searchLower) ||
          s.personalInfo.lastName.toLowerCase().includes(searchLower) ||
          s.employment.rank.toLowerCase().includes(searchLower) ||
          s.personalInfo.nationality.toLowerCase().includes(searchLower)
        );
      }
      
      return results;
    },
  });

  const onboardCrew = seafarers.filter(s => s.employment.status === 'onboard').length;
  const onLeaveCrew = seafarers.filter(s => s.employment.status === 'on_leave').length;
  const inactiveCrew = seafarers.filter(s => s.employment.status === 'inactive').length;

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Seafarer Management</h1>
          <p className="text-muted-foreground">
            Manage crew members, certificates, and assignments
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Seafarer
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Onboard</p>
                <p className="text-2xl font-bold">{onboardCrew}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">On Leave</p>
                <p className="text-2xl font-bold">{onLeaveCrew}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Award className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Training</p>
                <p className="text-2xl font-bold">
                  {seafarers.filter(s => s.employment.status === 'on_training').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Users className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Inactive</p>
                <p className="text-2xl font-bold">{inactiveCrew}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="space-y-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <TabsList>
            <TabsTrigger value="all">All Crew</TabsTrigger>
            <TabsTrigger value="onboard">Onboard</TabsTrigger>
            <TabsTrigger value="available">Available</TabsTrigger>
            <TabsTrigger value="certificates">Certificates</TabsTrigger>
          </TabsList>
          
          <div className="flex flex-1 gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search seafarers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={selectedCompany} onValueChange={setSelectedCompany}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>
                    {company.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="onboard">Onboard</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="on_training">Training</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                <SelectItem value="deck">Deck</SelectItem>
                <SelectItem value="engine">Engine</SelectItem>
                <SelectItem value="catering">Catering</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <TabsContent value="all">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded-lg animate-pulse" />
              ))}
            </div>
          ) : seafarers.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No seafarers found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm ? 'No seafarers match your search criteria.' : 'Get started by adding your first crew member.'}
                </p>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Seafarer
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {seafarers.map((seafarer) => (
                <SeafarerCard key={seafarer.id} seafarer={seafarer} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="onboard">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seafarers
              .filter(s => s.employment.status === 'onboard')
              .map((seafarer) => (
                <SeafarerCard key={seafarer.id} seafarer={seafarer} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="available">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {seafarers
              .filter(s => s.employment.status === 'on_leave')
              .map((seafarer) => (
                <SeafarerCard key={seafarer.id} seafarer={seafarer} />
              ))}
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Overview</CardTitle>
              <CardDescription>
                Track certificate expirations and compliance status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Certificate management interface coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}