import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Upload, Download, Eye, Trash2, AlertTriangle, Clock } from 'lucide-react';
import { formatDate, StatusBadge } from '@/lib/table-utils';
import { useCompany } from '@/context/CompanyContext';
import { db } from '@/lib/database2';
import type { Document, Seafarer, Vessel } from '@/lib/schemas';
import { useToast } from '@/hooks/use-toast';

interface DocumentWithDetails extends Document {
  seafarerName?: string;
  vesselName?: string;
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const { selectedCompany } = useCompany();
  const { toast } = useToast();

  useEffect(() => {
    if (selectedCompany) {
      loadDocuments();
    }
  }, [selectedCompany]);

  const loadDocuments = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      const allDocuments = await db.getAll<Document>('documents');
      const companyDocuments = allDocuments.filter(doc => doc.companyId === selectedCompany.id);
      
      // Enrich documents with related entity names
      const enrichedDocuments = await Promise.all(
        companyDocuments.map(async (doc) => {
          const enrichedDoc: DocumentWithDetails = { ...doc };
          
          if (doc.relatedTo.entityType === 'seafarer') {
            const seafarer = await db.getSeafarer(doc.relatedTo.entityId);
            if (seafarer) {
              enrichedDoc.seafarerName = `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}`;
            }
          } else if (doc.relatedTo.entityType === 'vessel') {
            const vessel = await db.getVessel(doc.relatedTo.entityId);
            if (vessel) {
              enrichedDoc.vesselName = vessel.name;
            }
          }
          
          return enrichedDoc;
        })
      );
      
      setDocuments(enrichedDocuments);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load documents',
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (doc: Document) => {
    if (!doc.expiryDate) return <StatusBadge status="valid" />;
    
    const expiryDate = new Date(doc.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <StatusBadge status="expired" />;
    } else if (daysUntilExpiry <= 30) {
      return <StatusBadge status="expiring_soon" />;
    } else {
      return <StatusBadge status="valid" />;
    }
  };

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         doc.relatedTo.entityName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'all') return matchesSearch;
    if (activeTab === 'expiring') {
      if (!doc.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return matchesSearch && daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    }
    if (activeTab === 'expired') {
      if (!doc.expiryDate) return false;
      const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
      return matchesSearch && daysUntilExpiry < 0;
    }
    
    return matchesSearch && doc.type === activeTab;
  });

  const expiringCount = documents.filter(doc => {
    if (!doc.expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  }).length;

  const expiredCount = documents.filter(doc => {
    if (!doc.expiryDate) return false;
    const daysUntilExpiry = Math.ceil((new Date(doc.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry < 0;
  }).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading documents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Document Management</h2>
          <p className="text-muted-foreground">Manage and track all documents</p>
        </div>
        <Button>
          <Upload className="w-4 h-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total Documents</p>
                <p className="text-2xl font-bold">{documents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
                <p className="text-2xl font-bold">{expiringCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl font-bold">{expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Eye className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Valid</p>
                <p className="text-2xl font-bold">{documents.length - expiringCount - expiredCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <Input
            placeholder="Search documents by name, related entity..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </CardContent>
      </Card>

      {/* Documents List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="all">All ({documents.length})</TabsTrigger>
          <TabsTrigger value="certificate">Certificates</TabsTrigger>
          <TabsTrigger value="contract">Contracts</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="expiring">Expiring ({expiringCount})</TabsTrigger>
          <TabsTrigger value="expired">Expired ({expiredCount})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <div className="grid gap-4">
            {filteredDocuments.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="w-5 h-5 text-muted-foreground" />
                        <h3 className="font-semibold">{doc.name}</h3>
                        <Badge variant="outline">{doc.type}</Badge>
                        {getStatusBadge(doc)}
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium">Related to:</span>
                          <br />
                          {doc.relatedTo.entityType === 'seafarer' && doc.seafarerName}
                          {doc.relatedTo.entityType === 'vessel' && doc.vesselName}
                          {doc.relatedTo.entityType === 'company' && doc.relatedTo.entityName}
                        </div>
                        
                        <div>
                          <span className="font-medium">Issue Date:</span>
                          <br />
                          {formatDate(doc.issueDate)}
                        </div>
                        
                        {doc.expiryDate && (
                          <div>
                            <span className="font-medium">Expiry Date:</span>
                            <br />
                            {formatDate(doc.expiryDate)}
                          </div>
                        )}
                        
                        <div>
                          <span className="font-medium">File Type:</span>
                          <br />
                          {doc.fileType.toUpperCase()}
                        </div>
                      </div>
                      
                      {doc.description && (
                        <p className="text-sm text-muted-foreground mt-2">{doc.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredDocuments.length === 0 && (
              <Card>
                <CardContent className="p-8 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No documents found</h3>
                  <p className="text-muted-foreground">
                    {searchTerm ? 'Try adjusting your search criteria' : 'Start by uploading your first document'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}