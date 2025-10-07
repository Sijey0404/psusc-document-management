
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, Search, CheckCircle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/document/StatusBadge";
import { FilterDropdown } from "@/components/document/FilterDropdown";
import { ViewDocumentModal } from "@/components/document/ViewDocumentModal";
import { Document } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

const Documents = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isPendingOnly, setIsPendingOnly] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Fetch all documents with related data
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          profiles!submitted_by (name),
          reviewer:profiles!reviewed_by (name),
          department:departments!documents_department_id_fkey (name),
          category:document_categories!documents_category_id_fkey (name, semester, deadline)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Transform data to match Document type structure
        const formattedDocuments: Document[] = data.map(doc => ({
          ...doc,
          status: doc.status as "PENDING" | "APPROVED" | "REJECTED",
          profiles: doc.profiles,
          reviewer: doc.reviewer,
          department: doc.department,
          document_categories: doc.category
        }));
        
        setDocuments(formattedDocuments);
        setFilteredDocuments(formattedDocuments);
      }
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Apply search filter and pending filter
    let filtered = [...documents];
    
    // Apply search filter if search query exists
    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.profiles?.name &&
            doc.profiles.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply pending filter if enabled
    if (isPendingOnly) {
      filtered = filtered.filter(doc => doc.status === "PENDING");
    }
    
    setFilteredDocuments(filtered);
  }, [searchQuery, documents, isPendingOnly]);

  const handleFilterChange = ({ departmentId, categoryId, semester, schoolYear }: { departmentId?: string, categoryId?: string, semester?: string, schoolYear?: string }) => {
    let filtered = [...documents];
    
    if (departmentId && departmentId !== 'all-departments') {
      filtered = filtered.filter(doc => doc.department_id === departmentId);
    }
    
    if (categoryId && categoryId !== 'all-categories') {
      filtered = filtered.filter(doc => doc.category_id === categoryId);
    }
    
    if (semester && semester !== 'all-semesters') {
      filtered = filtered.filter(doc => doc.document_categories?.semester === semester);
    }
    
    if (schoolYear) {
      filtered = filtered.filter(doc => {
        if (!doc.document_categories?.deadline) return false;
        const deadlineYear = new Date(doc.document_categories.deadline).getFullYear().toString();
        return deadlineYear === schoolYear;
      });
    }
    
    // Apply pending filter if enabled
    if (isPendingOnly) {
      filtered = filtered.filter(doc => doc.status === "PENDING");
    }
    
    // Apply search filter if search query exists
    if (searchQuery) {
      filtered = filtered.filter(
        (doc) =>
          doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (doc.profiles?.name &&
            doc.profiles.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    setFilteredDocuments(filtered);
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const openDocumentViewer = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedDocument(null);
  };

  const togglePendingFilter = () => {
    setIsPendingOnly(!isPendingOnly);
  };

  const approveAllPendingDocuments = async () => {
    if (!isAdmin || !user) return;
    
    try {
      setApproving(true);
      
      // Get all pending documents
      const pendingDocuments = documents.filter(doc => doc.status === "PENDING");
      
      if (pendingDocuments.length === 0) {
        toast({
          title: "No pending documents",
          description: "There are no pending documents to approve.",
          variant: "default",
        });
        return;
      }
      
      // Update all pending documents to approved status
      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'APPROVED',
          reviewed_by: user.id,
          updated_at: new Date().toISOString()
        })
        .in('id', pendingDocuments.map(doc => doc.id));
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: `${pendingDocuments.length} documents have been approved.`,
        variant: "default",
      });
      
      // Refresh the documents list
      fetchDocuments();
      
    } catch (error: any) {
      console.error("Error approving documents:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve documents",
        variant: "destructive",
      });
    } finally {
      setApproving(false);
    }
  };

  return (
    <AppLayout>
      <Card className="min-h-[calc(100vh-8rem)]">
        <CardHeader className="flex flex-col sm:flex-row justify-between space-y-2 sm:space-y-0 sm:items-center pb-2">
          <CardTitle className="text-xl">Documents</CardTitle>
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
            {isAdmin && (
              <Button
                variant="default"
                size="sm"
                onClick={approveAllPendingDocuments}
                disabled={approving}
                className="gap-1"
              >
                <CheckCircle className="h-4 w-4" />
                <span>{approving ? "Approving..." : "Approve all Pending"}</span>
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => navigate('/documents/new')}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>New Document</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between mb-4 space-y-2 sm:space-y-0">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                className="pl-8"
                value={searchQuery}
                onChange={handleSearch}
              />
            </div>
            <div className="flex space-x-2">
              {isAdmin && (
                <Button
                  variant={isPendingOnly ? "default" : "outline"}
                  size="sm"
                  onClick={togglePendingFilter}
                  className="gap-1"
                >
                  <span>Pending Documents</span>
                </Button>
              )}
              <FilterDropdown onFilterChange={handleFilterChange} />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <p>Loading documents...</p>
            </div>
          ) : filteredDocuments.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Uploader</TableHead>
                    <TableHead>Date Submitted</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2 text-muted-foreground" />
                          {document.title}
                        </div>
                      </TableCell>
                      <TableCell>{document.profiles?.name || "Unknown"}</TableCell>
                      <TableCell>
                        {new Date(document.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={document.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDocumentViewer(document)}
                          >
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <Link to={`/documents/${document.id}`}>Details</Link>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8">
              <FileText className="h-10 w-10 text-muted-foreground mb-2" />
              <p className="text-lg font-medium">No documents found</p>
              <p className="text-muted-foreground">
                {searchQuery || isPendingOnly
                  ? "Try adjusting your search or filters"
                  : "Upload your first document to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedDocument && (
        <ViewDocumentModal
          isOpen={showDocumentViewer}
          onClose={closeDocumentViewer}
          filePath={selectedDocument.file_path}
          fileType={selectedDocument.file_type}
          fileName={selectedDocument.title}
        />
      )}
    </AppLayout>
  );
};

export default Documents;
