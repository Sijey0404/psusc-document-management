
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Plus, Search, CheckCircle, ExternalLink, Download, Loader2, ArrowLeft, Check, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { StatusBadge } from "@/components/document/StatusBadge";
import { FilterDropdown } from "@/components/document/FilterDropdown";
import { ViewDocumentModal } from "@/components/document/ViewDocumentModal";
import { Document } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { format } from "date-fns";

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
  
  // New state for user-based view
  const [showUserView, setShowUserView] = useState(true);
  const [documentUploaders, setDocumentUploaders] = useState<Array<{name: string, email: string, uploaded_at: string, user_id: string}>>([]);
  const [loadingUploaders, setLoadingUploaders] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{name: string, email: string, user_id: string} | null>(null);
  const [userFiles, setUserFiles] = useState<Array<{id: string, title: string, status: string, created_at: string, file_type: string, file_path: string, feedback: string | null}>>([]);
  const [loadingUserFiles, setLoadingUserFiles] = useState(false);
  
  // Filter states
  const [semesterFilter, setSemesterFilter] = useState<string>("");
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>("");
  
  // Rejection dialog state
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [documentToReject, setDocumentToReject] = useState<{id: string, title: string} | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Function to convert MIME type to user-friendly file extension
  const getFileExtension = (fileType: string, fileName: string): string => {
    const fileNameLower = fileName.toLowerCase();
    
    // First check if we can get extension from filename
    const extensionFromName = fileNameLower.split('.').pop();
    if (extensionFromName && extensionFromName.length <= 5) {
      return extensionFromName.toUpperCase();
    }
    
    // Convert MIME type to extension
    const mimeToExt: { [key: string]: string } = {
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'application/msword': 'DOC',
      'application/vnd.ms-excel': 'XLS',
      'application/vnd.ms-powerpoint': 'PPT',
      'text/plain': 'TXT',
      'text/html': 'HTML',
      'text/css': 'CSS',
      'text/javascript': 'JS',
      'application/javascript': 'JS',
      'application/json': 'JSON',
      'application/xml': 'XML',
      'text/xml': 'XML',
      'text/csv': 'CSV',
      'image/jpeg': 'JPG',
      'image/jpg': 'JPG',
      'image/png': 'PNG',
      'image/gif': 'GIF',
      'image/bmp': 'BMP',
      'image/webp': 'WEBP',
      'image/svg+xml': 'SVG',
      'image/tiff': 'TIFF',
      'video/mp4': 'MP4',
      'video/avi': 'AVI',
      'video/quicktime': 'MOV',
      'video/x-msvideo': 'AVI',
      'video/webm': 'WEBM',
      'audio/mpeg': 'MP3',
      'audio/wav': 'WAV',
      'audio/ogg': 'OGG',
      'audio/aac': 'AAC',
      'audio/flac': 'FLAC',
      'application/zip': 'ZIP',
      'application/x-rar-compressed': 'RAR',
      'application/x-7z-compressed': '7Z',
      'application/x-tar': 'TAR',
      'application/gzip': 'GZ',
      'application/x-bzip2': 'BZ2'
    };
    
    return mimeToExt[fileType.toLowerCase()] || 'FILE';
  };

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
        
        // Also fetch document uploaders for user view
        await fetchDocumentUploaders();
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

  const fetchDocumentUploaders = async () => {
    try {
      setLoadingUploaders(true);
      const { data, error } = await supabase
        .from("documents")
        .select(`
          created_at,
          submitted_by,
          profiles!submitted_by (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      // Get unique users who uploaded documents
      const uniqueUsers = new Map();
      data?.forEach(doc => {
        if (doc.submitted_by && doc.profiles) {
          uniqueUsers.set(doc.submitted_by, {
            name: doc.profiles.name || "Unknown",
            email: doc.profiles.email || "Unknown",
            uploaded_at: doc.created_at,
            user_id: doc.submitted_by
          });
        }
      });
      
      const uploaders = Array.from(uniqueUsers.values());
      
      // Sort uploaders alphabetically by name
      uploaders.sort((a, b) => a.name.localeCompare(b.name));
      
      setDocumentUploaders(uploaders);
    } catch (error: any) {
      toast({
        title: "Error fetching document uploaders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUploaders(false);
    }
  };

  const fetchUserFiles = async (userId: string) => {
    try {
      setLoadingUserFiles(true);
      const { data, error } = await supabase
        .from("documents")
        .select(`
          id, title, status, created_at, file_type, file_path, feedback,
          document_categories!documents_category_id_fkey (
            semester, deadline
          )
        `)
        .eq("submitted_by", userId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      let filteredData = data || [];
      
      // Apply semester filter
      if (semesterFilter && semesterFilter !== "all") {
        filteredData = filteredData.filter(doc => 
          doc.document_categories?.semester === semesterFilter
        );
      }
      
      // Apply school year filter
      if (schoolYearFilter.trim() !== "") {
        filteredData = filteredData.filter(doc => {
          if (!doc.document_categories?.deadline) return false;
          const year = new Date(doc.document_categories.deadline).getFullYear();
          return year.toString() === schoolYearFilter.trim();
        });
      }
      
      setUserFiles(filteredData);
    } catch (error: any) {
      toast({
        title: "Error fetching user files",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUserFiles(false);
    }
  };

  const handleUserClick = async (user: {name: string, email: string, user_id: string}) => {
    setSelectedUser(user);
    await fetchUserFiles(user.user_id);
    setShowUserView(false);
  };

  const clearFilters = () => {
    setSemesterFilter("");
    setSchoolYearFilter("");
  };

  // Refresh user files when filters change
  useEffect(() => {
    if (selectedUser && !showUserView) {
      fetchUserFiles(selectedUser.user_id);
    }
  }, [semesterFilter, schoolYearFilter]);

  const handleDocumentView = async (filePath: string, fileName: string, fileType: string) => {
    try {
      // Get a signed URL for the file that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      
      if (error) {
        throw error;
      }
      
      if (!data?.signedUrl) {
        throw new Error('Could not get signed URL for file');
      }
      
      // Set the selected file and open the viewer
      setSelectedDocument({ 
        id: '', 
        title: fileName, 
        file_path: filePath, 
        file_type: fileType,
        status: 'PENDING',
        created_at: '',
        updated_at: '',
        submitted_by: '',
        reviewed_by: null,
        department_id: '',
        category_id: '',
        profiles: null,
        reviewer: null,
        department: null,
        document_categories: null
      });
      setShowDocumentViewer(true);
      
    } catch (error: any) {
      toast({
        title: "Error viewing file",
        description: error.message || "Failed to open the file",
        variant: "destructive",
      });
    }
  };

  const handleDocumentDownload = async (filePath: string, fileName: string) => {
    try {
      // Get a signed URL for the file that expires in 1 hour
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(filePath, 3600);
      
      if (error) {
        throw error;
      }
      
      if (!data?.signedUrl) {
        throw new Error('Could not get signed URL for file');
      }
      
      // Create a temporary link element and click it to download
      const link = document.createElement('a');
      link.href = data.signedUrl;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: `Downloading ${fileName}`,
      });
      
    } catch (error: any) {
      toast({
        title: "Error downloading file",
        description: error.message || "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  const handleApproveDocument = async (documentId: string, documentTitle: string) => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'APPROVED',
          reviewed_by: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (error) throw error;
      
      toast({
        title: "Document approved",
        description: `${documentTitle} has been approved successfully.`,
        variant: "default",
      });
      
      // Refresh the data
      await fetchDocuments();
      if (selectedUser) {
        await fetchUserFiles(selectedUser.user_id);
      }
      
    } catch (error: any) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectDocument = async (documentId: string, documentTitle: string) => {
    if (!user) return;
    
    try {
      setIsProcessing(true);
      
      const { error } = await supabase
        .from('documents')
        .update({ 
          status: 'REJECTED',
          reviewed_by: user.id,
          feedback: rejectionReason.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId);
      
      if (error) throw error;
      
      toast({
        title: "Document rejected",
        description: `${documentTitle} has been rejected.`,
        variant: "default",
      });
      
      // Close dialog and reset state
      setShowRejectDialog(false);
      setRejectionReason("");
      setDocumentToReject(null);
      
      // Refresh the data
      await fetchDocuments();
      if (selectedUser) {
        await fetchUserFiles(selectedUser.user_id);
      }
      
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject document",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const openRejectDialog = (documentId: string, documentTitle: string) => {
    setDocumentToReject({ id: documentId, title: documentTitle });
    setRejectionReason("");
    setShowRejectDialog(true);
  };

  const closeRejectDialog = () => {
    setShowRejectDialog(false);
    setRejectionReason("");
    setDocumentToReject(null);
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
          {showUserView ? (
            // User List View
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Document Uploaders</h3>
                <p className="text-sm text-muted-foreground">
                  {documentUploaders.length} user{documentUploaders.length !== 1 ? 's' : ''} found
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="semesterFilter" className="text-sm whitespace-nowrap">Semester</Label>
                  <select
                    id="semesterFilter"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Semesters</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="schoolYearFilter" className="text-sm whitespace-nowrap">School Year</Label>
                  <Input
                    id="schoolYearFilter"
                    type="number"
                    placeholder="e.g., 2025"
                    value={schoolYearFilter}
                    onChange={(e) => setSchoolYearFilter(e.target.value)}
                    className="w-32"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              </div>

              {loadingUploaders ? (
                <div className="flex justify-center py-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Loading users...</p>
                  </div>
                </div>
              ) : documentUploaders.length > 0 ? (
                <div className="space-y-2">
                  {documentUploaders.map((uploader, index) => (
                    <div 
                      key={index} 
                      className="flex items-center justify-between p-3 border rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => handleUserClick(uploader)}
                    >
                      <div className="flex-1">
                        <p className="font-medium">{uploader.name}</p>
                        <p className="text-sm text-muted-foreground">{uploader.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(uploader.uploaded_at), "MMM dd, yyyy 'at' h:mm a")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No users have uploaded documents yet.</p>
                </div>
              )}
            </div>
          ) : (
            // User Documents View
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowUserView(true)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Users
                </Button>
                <div>
                  <h3 className="text-lg font-semibold">{selectedUser?.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedUser?.email}</p>
                </div>
              </div>

              {/* Filters for User Documents */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label htmlFor="semesterFilterDoc" className="text-sm whitespace-nowrap">Semester</Label>
                  <select
                    id="semesterFilterDoc"
                    value={semesterFilter}
                    onChange={(e) => setSemesterFilter(e.target.value)}
                    className="px-3 py-1.5 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">All Semesters</option>
                    <option value="1st Semester">1st Semester</option>
                    <option value="2nd Semester">2nd Semester</option>
                  </select>
                </div>
                
                <div className="flex items-center gap-2">
                  <Label htmlFor="schoolYearFilterDoc" className="text-sm whitespace-nowrap">School Year</Label>
                  <Input
                    id="schoolYearFilterDoc"
                    type="number"
                    placeholder="e.g., 2025"
                    value={schoolYearFilter}
                    onChange={(e) => setSchoolYearFilter(e.target.value)}
                    className="w-32"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearFilters}
                  className="whitespace-nowrap"
                >
                  Clear Filters
                </Button>
              </div>

              {/* Active Filters Display */}
              {(semesterFilter || schoolYearFilter) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  <span className="text-sm text-muted-foreground">Active filters:</span>
                  {semesterFilter && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Semester: {semesterFilter}
                    </span>
                  )}
                  {schoolYearFilter && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      Year: {schoolYearFilter}
                    </span>
                  )}
                </div>
              )}

              {loadingUserFiles ? (
                <div className="flex justify-center py-8">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <p>Loading documents...</p>
                  </div>
                </div>
              ) : userFiles.length > 0 ? (
                <div className="space-y-2">
                  {userFiles.map((file, fileIndex) => (
                    <div key={fileIndex} className="p-3 border rounded-lg bg-muted/30">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium">{file.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {getFileExtension(file.file_type, file.title)} • {format(new Date(file.created_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                        <div className="ml-4 flex items-center gap-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            file.status === 'APPROVED' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                              : file.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                          }`}>
                            {file.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentView(file.file_path, file.title, file.file_type)}
                            className="flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDocumentDownload(file.file_path, file.title)}
                            className="flex items-center gap-1"
                          >
                            <Download className="h-3 w-3" />
                            Download
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {file.status === 'PENDING' && isAdmin && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleApproveDocument(file.id, file.title)}
                                disabled={isProcessing}
                                className="flex items-center gap-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                              >
                                <Check className="h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openRejectDialog(file.id, file.title)}
                                disabled={isProcessing}
                                className="flex items-center gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                                Reject
                              </Button>
                            </>
                          )}
                          
                          {file.status === 'REJECTED' && file.feedback && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                              <X className="h-3 w-3 text-red-500 flex-shrink-0" />
                              <div className="text-left">
                                <p className="text-xs font-medium text-red-800 dark:text-red-200">Feedback:</p>
                                <p className="text-xs text-red-700 dark:text-red-300 max-w-xs truncate" title={file.feedback}>
                                  {file.feedback}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents uploaded by this user.</p>
                </div>
              )}
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

      {/* Rejection Reason Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <X className="h-5 w-5 text-red-500" />
              Reject Document
            </DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting "{documentToReject?.title}".
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Rejection Reason</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="min-h-[100px]"
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeRejectDialog}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={() => documentToReject && handleRejectDocument(documentToReject.id, documentToReject.title)}
              disabled={isProcessing || !rejectionReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Documents;
