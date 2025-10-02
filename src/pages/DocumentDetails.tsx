import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/use-toast";
import { CheckCircle, Download, FileText, XCircle, Eye, RefreshCw } from "lucide-react";
import { Document as AppDocument } from "@/types";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ViewDocumentModal } from "@/components/document/ViewDocumentModal";

const DocumentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, profile } = useAuth();
  const [document, setDocument] = useState<AppDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  useEffect(() => {
    const fetchDocument = async () => {
      if (!id || !user) return;
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('documents')
          .select(`
            *,
            profiles:submitted_by (name),
            reviewer:reviewed_by (name),
            document_categories:category_id (name)
          `)
          .eq('id', id)
          .maybeSingle();
        
        if (error) throw error;
        
        if (!data) {
          toast({
            title: "Document not found",
            description: "The document you're looking for could not be found.",
            variant: "destructive",
          });
          navigate('/documents');
          return;
        }
        
        if (!isAdmin && data.submitted_by !== user.id) {
          toast({
            title: "Access denied",
            description: "You don't have permission to view this document.",
            variant: "destructive",
          });
          navigate('/documents');
          return;
        }
        
        setDocument(data as unknown as AppDocument);
        
        if (data.feedback) {
          setFeedback(data.feedback);
        }
        
        const { data: deptData, error: deptError } = await supabase
          .from('departments')
          .select('name')
          .eq('id', data.department_id)
          .maybeSingle();
        
        if (!deptError && deptData) {
          setDepartment(deptData.name);
        }
        
        const { data: catData, error: catError } = await supabase
          .from('document_categories')
          .select('name')
          .eq('id', data.category_id)
          .maybeSingle();
        
        if (!catError && catData) {
          setCategory(catData.name);
        }
      } catch (error: any) {
        console.error("Error fetching document:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch document details",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDocument();
    }
  }, [id, user, isAdmin, navigate]);

  const handleApprove = async () => {
    if (!document || !profile) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: "APPROVED",
          reviewed_by: profile.id,
          feedback: feedback || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);
      
      if (error) throw error;
      
      setDocument(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          status: "APPROVED",
          reviewed_by: profile.id,
          feedback: feedback || null,
          updated_at: new Date().toISOString(),
          reviewer: { name: profile.name || "Unknown" }
        };
      });
      
      toast({
        title: "Document approved",
        description: "The document has been approved successfully.",
      });
    } catch (error: any) {
      console.error("Error approving document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve document",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!document || !profile) return;
    
    setIsSubmitting(true);
    
    if (!feedback.trim()) {
      toast({
        title: "Feedback required",
        description: "Please provide feedback before rejecting the document.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const { error } = await supabase
        .from('documents')
        .update({
          status: "REJECTED",
          reviewed_by: profile.id,
          feedback: feedback,
          updated_at: new Date().toISOString()
        })
        .eq('id', document.id);
      
      if (error) throw error;
      
      setDocument(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          status: "REJECTED",
          reviewed_by: profile.id,
          feedback: feedback,
          updated_at: new Date().toISOString(),
          reviewer: { name: profile.name || "Unknown" }
        };
      });
      
      toast({
        title: "Document rejected",
        description: "The document has been rejected with feedback.",
      });
    } catch (error: any) {
      console.error("Error rejecting document:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to reject document",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = async () => {
    if (!document) return;
    
    try {
      setIsDownloading(true);
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path);
      
      if (error) throw error;
      
      const url = URL.createObjectURL(data);
      const link = window.document.createElement('a');
      const fileName = document.file_path.split('/').pop() || 'download';
      
      link.href = url;
      link.setAttribute('download', fileName);
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your file is being downloaded",
      });
    } catch (error: any) {
      console.error("Error downloading file:", error);
      toast({
        title: "Download failed",
        description: error.message || "Failed to download file",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleViewDocument = () => {
    setIsViewModalOpen(true);
  };

  const handleResubmit = () => {
    navigate('/faculty-folders');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p>Loading document details...</p>
        </div>
      </AppLayout>
    );
  }

  if (!document) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <h1 className="text-2xl font-bold mb-2">Document Not Found</h1>
          <p className="text-muted-foreground mb-4">The document you're looking for could not be found.</p>
          <Button onClick={() => navigate('/documents')}>Back to Documents</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout isAdmin={isAdmin}>
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Document Details</h1>
          <Button variant="outline" onClick={() => navigate(-1)}>
            Back
          </Button>
        </div>
        
        <Card className="mb-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>{document.title}</CardTitle>
              <CardDescription>
                {document.description}
              </CardDescription>
            </div>
            <StatusBadge status={document.status} />
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="p-6 border rounded-lg flex flex-col sm:flex-row items-center justify-between bg-muted/30">
              <div className="flex items-center mb-4 sm:mb-0">
                <FileText className="h-10 w-10 text-primary mr-4" />
                <div>
                  <p className="font-medium">{document.file_path.split('/').pop() || 'document'}</p>
                  <p className="text-sm text-muted-foreground">
                    {(document.file_size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleViewDocument} className="gap-2">
                  <Eye className="h-4 w-4" /> View
                </Button>
                <Button onClick={handleDownload} className="gap-2">
                  <Download className="h-4 w-4" /> Download
                </Button>
                {document.status === "REJECTED" && !isAdmin && (
                  <Button onClick={handleResubmit} className="gap-2">
                    <RefreshCw className="h-4 w-4" /> Resubmit
                  </Button>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Category
                </p>
                <p>{document.document_categories?.name || category || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Submitted By
                </p>
                <p>{document.profiles?.name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Department
                </p>
                <p>{department || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Submitted On
                </p>
                <p>{formatDate(document.created_at)}</p>
              </div>
              {document.reviewed_by && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    Reviewed By
                  </p>
                  <p>{document.reviewer?.name || 'Unknown'}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Last Updated
                </p>
                <p>{formatDate(document.updated_at)}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Status
                </p>
                <p>{document.status}</p>
              </div>
            </div>
            
            {document.status === "REJECTED" && document.feedback && (
              <div className="p-4 border rounded-md bg-red-50">
                <p className="text-sm font-medium text-red-600 mb-1">
                  Rejection Feedback
                </p>
                <p className="text-sm">{document.feedback}</p>
              </div>
            )}
          </CardContent>
        </Card>
        
        {isAdmin && document.status === "PENDING" && (
          <Card>
            <CardHeader>
              <CardTitle>Review Document</CardTitle>
              <CardDescription>
                Review the document and approve or reject it with feedback.
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Feedback (required for rejection)</p>
                <Textarea
                  placeholder="Enter feedback or comments..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={4}
                />
              </div>
            </CardContent>
            
            <CardFooter className="justify-between">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isSubmitting}>
                    <XCircle className="h-4 w-4 mr-2" /> Reject
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reject Document?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will reject the document and send feedback to the submitter.
                      Please ensure you've provided helpful feedback for the rejection.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleReject}>Confirm</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
              >
                <CheckCircle className="h-4 w-4 mr-2" /> Approve
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Document Viewer Modal */}
        {document && (
          <ViewDocumentModal
            isOpen={isViewModalOpen}
            onClose={() => setIsViewModalOpen(false)}
            filePath={document.file_path}
            fileType={document.file_type}
            fileName={document.file_path.split('/').pop() || 'document'}
          />
        )}
      </div>
    </AppLayout>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  switch (status) {
    case "PENDING":
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
          {status}
        </Badge>
      );
  }
};

export default DocumentDetails;
