
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Edit, Trash, Plus, Folder, AlertCircle, Filter, X, Eye, FileText, Loader2, ExternalLink, Download, MessageSquare, ChevronRight, Home, ChevronLeft } from "lucide-react";
import { format } from "date-fns";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Folder = {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null;
  semester: string | null;
  created_at: string;
  updated_at: string;
  department_id?: string | null;
  parent_id?: string | null;
};

type FolderDocument = {
  id: string;
  title: string;
  status: string;
  created_at: string;
  profiles?: {
    name?: string | null;
    email?: string | null;
  } | null;
};

import { useAuth } from "@/context/AuthContext";

const ISO_DATETIME_LOCAL_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const normalizeDateTimeLocalValue = (value: string): string => {
  if (!value) return "";
  if (ISO_DATETIME_LOCAL_REGEX.test(value)) {
    return value;
  }
  
  const sanitizedValue = value.replace(/--/g, "").replace(/[^\d/: TAMPamp]/g, "").trim();
  if (!sanitizedValue) return "";
  
  const parsedDate = new Date(sanitizedValue);
  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }
  
  return parsedDate.toISOString().slice(0, 16);
};

const Folders = () => {
  const { toast } = useToast();
  const { profile } = useAuth();
  const adminDepartmentId = profile?.department_id || null;
  
  const [folders, setFolders] = useState<Folder[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewedFolder, setViewedFolder] = useState<Folder | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const currentFolder = folderPath[folderPath.length - 1] || null;
  const [folderDocuments, setFolderDocuments] = useState<FolderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  
  const defaultFormState = {
    name: "",
    description: "",
    deadline: "",
    semester: "",
    parent_id: null as string | null,
  };
  const [formData, setFormData] = useState(defaultFormState);
  const isRootContext = !formData.parent_id;

  const fetchFolders = async () => {
    try {
      setLoading(true);
      
      if (!adminDepartmentId) {
        setFolders([]);
        setFilteredFolders([]);
        setLoading(false);
        toast({
          title: "Department not set",
          description: "Please contact the system administrator to assign your department before managing folders.",
          variant: "destructive",
        });
        return;
      }
      
      let query = (supabase as any)
        .from("document_categories")
        .select("*, semester, department_id, parent_id")
        .eq("department_id", adminDepartmentId)
        .order("name");
      
      if (currentFolder?.id) {
        query = query.eq("parent_id", currentFolder.id);
      } else {
        query = query.is("parent_id", null);
      }

      const { data, error } = await query;
        
      if (error) throw error;
      
      setFolders(data || []);
      setFilteredFolders(data || []);
    } catch (error: any) {
      toast({
        title: "Error fetching folders",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, [adminDepartmentId, currentFolder?.id]);

  useEffect(() => {
    setFolderPath([]);
  }, [adminDepartmentId]);
  
  // Apply filters when semesterFilter or schoolYearFilter changes
  useEffect(() => {
    let filtered = folders;
    
    // Filter by semester
    if (semesterFilter) {
      filtered = filtered.filter(folder => 
        semesterFilter === "all" || folder.semester === semesterFilter
      );
    }
    
    // Filter by school year
    if (schoolYearFilter.trim() !== "") {
      filtered = filtered.filter(folder => {
        if (!folder.deadline) return false;
        const year = new Date(folder.deadline).getFullYear();
        return year.toString() === schoolYearFilter.trim();
      });
    }
    
    setFilteredFolders(filtered);
  }, [semesterFilter, schoolYearFilter, folders]);
  
  const clearFilter = () => {
    setSemesterFilter(null);
    setSchoolYearFilter("");
  };

  const handleEnterFolder = (folder: Folder) => {
    setFolderPath(prev => [...prev, folder]);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    setFolderPath(folderPath.slice(0, index + 1));
  };

  const handleBackToParent = () => {
    if (folderPath.length === 0) return;
    setFolderPath(prev => prev.slice(0, -1));
  };

  const openCreateFolderDialog = () => {
    setSelectedFolder(null);
    setFormData({
      ...defaultFormState,
    parent_id: currentFolder?.id ?? null,
    });
    setFormOpen(true);
  };

  const fetchFolderDocuments = async (folderId: string) => {
    if (!adminDepartmentId) return;
    
    try {
      setDocumentsLoading(true);
      const { data, error } = await (supabase as any)
        .from("documents")
        .select(`
          id,
          title,
          status,
          created_at,
          profiles:submitted_by (name, email)
        `)
        .eq("department_id", adminDepartmentId)
        .eq("category_id", folderId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      setFolderDocuments((data as FolderDocument[]) || []);
    } catch (error: any) {
      console.error("Error fetching folder documents:", error);
      toast({
        title: "Error fetching documents",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDocumentsLoading(false);
    }
  };

  useEffect(() => {
    if (currentFolder?.id) {
      fetchFolderDocuments(currentFolder.id);
    } else {
      setFolderDocuments([]);
    }
  }, [currentFolder?.id, adminDepartmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (!adminDepartmentId) {
        toast({
          title: "Department not set",
          description: "Please contact the system administrator to assign your department before creating folders.",
          variant: "destructive",
        });
        return;
      }

      const payload = {
        name: formData.name,
        description: formData.description || null,
        deadline: formData.parent_id ? null : (formData.deadline || null),
        semester: formData.parent_id ? null : (formData.semester || null),
        department_id: adminDepartmentId,
        parent_id: formData.parent_id ?? null,
      };
      
      if (selectedFolder) {
        // Update existing folder
        const { error } = await (supabase as any)
          .from("document_categories")
          .update(payload)
          .eq("id", selectedFolder.id)
          .eq("department_id", adminDepartmentId);
          
        if (error) throw error;
        
        toast({
          title: "Folder updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new folder
        const { data: newFolder, error } = await (supabase as any)
          .from("document_categories")
          .insert([payload])
          .select();
          
        if (error) throw error;
        
        toast({
          title: "Folder created",
          description: `${formData.name} has been created successfully and faculty members have been notified.`,
        });
      }
      
      resetForm();
      fetchFolders();
    } catch (error: any) {
      toast({
        title: "Error saving folder",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEdit = (folder: Folder) => {
    setSelectedFolder(folder);
    setFormData({
      name: folder.name,
      description: folder.description || "",
      deadline: folder.deadline ? new Date(folder.deadline).toISOString().slice(0, 16) : "",
      semester: folder.semester || "",
      parent_id: folder.parent_id ?? null,
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;
    
    try {
      setIsDeleting(true);
      
      // Get count of documents using this category
      const { count, error: countError } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("category_id", selectedFolder.id)
        .eq("department_id", adminDepartmentId);
        
      if (countError) throw countError;
      
      // Delete the folder (this will now cascade delete documents)
      const { error } = await (supabase as any)
        .from("document_categories")
        .delete()
        .eq("id", selectedFolder.id)
        .eq("department_id", adminDepartmentId);
        
      if (error) throw error;
      
      toast({
        title: "Folder deleted",
        description: count && count > 0 
          ? `${selectedFolder.name} and its ${count} associated document${count === 1 ? '' : 's'} have been deleted.`
          : `${selectedFolder.name} has been deleted successfully.`,
      });
      
      setConfirmDeleteOpen(false);
      setSelectedFolder(null);
      fetchFolders();
    } catch (error: any) {
      toast({
        title: "Error deleting folder",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = (folder: Folder) => {
    setSelectedFolder(folder);
    setConfirmDeleteOpen(true);
  };

  const resetForm = () => {
    setFormData({
      ...defaultFormState,
    parent_id: currentFolder?.id ?? null,
    });
    setSelectedFolder(null);
    setFormOpen(false);
  };

  const [folderStats, setFolderStats] = useState({
    totalInstructors: 0,
    totalSubmissions: 0,
    ontime: 0,
    late: 0,
    rate: 0,
  });
  const [documentUploaders, setDocumentUploaders] = useState<Array<{name: string, email: string, uploaded_at: string, user_id: string}>>([]);
  const [showUploadersDialog, setShowUploadersDialog] = useState(false);
  const [loadingUploaders, setLoadingUploaders] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{name: string, email: string, user_id: string} | null>(null);
  const [userFiles, setUserFiles] = useState<Array<{title: string, status: string, created_at: string, file_type: string, file_path: string}>>([]);
  const [loadingUserFiles, setLoadingUserFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<{title: string, file_path: string, file_type: string} | null>(null);
  const [showFileViewer, setShowFileViewer] = useState(false);
  const [fileViewerUrl, setFileViewerUrl] = useState<string>("");
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [selectedFileForFeedback, setSelectedFileForFeedback] = useState<{title: string, file_path: string, file_type: string} | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [showInstructors, setShowInstructors] = useState(false);
  const [loadingInstructors, setLoadingInstructors] = useState(false);
  const [instructors, setInstructors] = useState<Array<{ id: string; name: string; email: string; submitted: boolean }>>([]);
  const [archivedSubmitters, setArchivedSubmitters] = useState<Array<{ id: string; name: string; email: string }>>([]);

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

  const handleView = async (folder: Folder) => {
    if (!adminDepartmentId) {
      toast({
        title: "Department not set",
        description: "Please contact the system administrator to assign your department before viewing submissions.",
        variant: "destructive",
      });
      return;
    }

    setViewedFolder(folder);
    setViewDialogOpen(true);
    setShowInstructors(false);
    setInstructors([]);
    setArchivedSubmitters([]);
    setLoadingInstructors(false);
    
    try {
      // Fetch total instructors (faculty members) - only active accounts
      const { count: instructorCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", false)
        .eq("archived", false)
        .eq("department_id", adminDepartmentId);
      
      // Fetch submissions for this folder (including status for filtering)
      const { data: submissions, error } = await supabase
        .from("documents")
        .select("created_at, status")
        .eq("category_id", folder.id)
        .eq("department_id", adminDepartmentId);
        
      if (error) throw error;
      
      // Determine archived submitters count (only archived accounts who submitted)
      let archivedSubmittersCount = 0;
      if (submissions && submissions.length > 0) {
        const { data: submittersForCount, error: submittersErr } = await supabase
          .from("documents")
          .select("submitted_by")
          .eq("category_id", folder.id)
          .eq("department_id", adminDepartmentId);
        if (submittersErr) throw submittersErr;

        const submittedIds = Array.from(new Set((submittersForCount || []).map((d: any) => d.submitted_by).filter(Boolean)));
        if (submittedIds.length > 0) {
          const { count: archivedCount, error: archivedCountErr } = await supabase
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .in("id", submittedIds)
            .eq("role", false)
            .eq("archived", true)
            .eq("department_id", adminDepartmentId);
          if (archivedCountErr) throw archivedCountErr;
          archivedSubmittersCount = archivedCount || 0;
        }
      }

      // Only count approved documents for Total Submissions
      const totalSubmissions = submissions?.filter((doc: any) => doc.status === 'APPROVED').length || 0;
      let ontime = 0;
      let late = 0;
      
      // Calculate ontime and late submissions
      if (folder.deadline && submissions) {
        const deadlineDate = new Date(folder.deadline);
        submissions.forEach(doc => {
          const submissionDate = new Date(doc.created_at);
          if (submissionDate <= deadlineDate) {
            ontime++;
          } else {
            late++;
          }
        });
      }
      
      // Calculate submission rate (submissions / instructors * 100)
      const rate = instructorCount ? ((totalSubmissions / instructorCount) * 100).toFixed(1) : 0;
      
      setFolderStats({
        totalInstructors: (instructorCount || 0) + archivedSubmittersCount,
        totalSubmissions,
        ontime,
        late,
        rate: Number(rate),
      });
    } catch (error: any) {
      toast({
        title: "Error fetching folder statistics",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchInstructorsForFolder = async (folderId: string) => {
    if (!adminDepartmentId) {
      toast({
        title: "Department not set",
        description: "Please contact the system administrator to assign your department before viewing instructors.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingInstructors(true);
      // Fetch submissions for this folder to see who submitted (build set first)
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("submitted_by")
        .eq("category_id", folderId)
        .eq("department_id", adminDepartmentId);
      if (docsError) throw docsError;

      const submittedIds = (docs || []).map((d: any) => d.submitted_by).filter(Boolean);
      const submittedSet = new Set(submittedIds);

      // Fetch all active faculty
      const { data: faculty, error: facultyError } = await supabase
        .from("profiles")
        .select("id, name, email")
        .eq("role", false)
        .eq("archived", false)
        .eq("department_id", adminDepartmentId);
      if (facultyError) throw facultyError;

      // Build active instructors list with submitted flag
      const list = (faculty || []).map((f: any) => ({
        id: f.id,
        name: f.name || "Unknown",
        email: f.email || "",
        submitted: submittedSet.has(f.id),
      }));
      list.sort((a, b) => a.name.localeCompare(b.name));
      setInstructors(list);

      // Fetch archived profiles who submitted to this folder (exclude archived without submissions)
      if (submittedIds.length > 0) {
        const { data: archivedProfiles, error: archivedError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", submittedIds)
          .eq("role", false)
          .eq("archived", true)
          .eq("department_id", adminDepartmentId);
        if (archivedError) throw archivedError;

        const archivedList = (archivedProfiles || []).map((p: any) => ({
          id: p.id,
          name: p.name || "Unknown",
          email: p.email || "",
        }));
        archivedList.sort((a, b) => a.name.localeCompare(b.name));
        setArchivedSubmitters(archivedList);
      } else {
        setArchivedSubmitters([]);
      }
      setShowInstructors(true);
    } catch (error: any) {
      toast({
        title: "Error loading instructors",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingInstructors(false);
    }
  };

  const fetchDocumentUploaders = async (folderId: string) => {
    if (!adminDepartmentId) {
      toast({
        title: "Department not set",
        description: "Please contact the system administrator to assign your department before viewing submissions.",
        variant: "destructive",
      });
      return;
    }

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
        .eq("category_id", folderId)
        .eq("department_id", adminDepartmentId)
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
      setShowUploadersDialog(true);
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

  const fetchUserFiles = async (userId: string, folderId: string) => {
    if (!adminDepartmentId) {
      toast({
        title: "Department not set",
        description: "Please contact the system administrator to assign your department before viewing submissions.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoadingUserFiles(true);
      const { data, error } = await supabase
        .from("documents")
        .select("title, status, created_at, file_type, file_path")
        .eq("category_id", folderId)
        .eq("submitted_by", userId)
        .eq("department_id", adminDepartmentId)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      
      setUserFiles(data || []);
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
    if (viewedFolder) {
      await fetchUserFiles(user.user_id, viewedFolder.id);
    }
  };

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
      setSelectedFile({ title: fileName, file_path: filePath, file_type: fileType });
      setFileViewerUrl(data.signedUrl);
      setShowFileViewer(true);
      
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

  const handleFeedbackClick = (file: {title: string, file_path: string, file_type: string}) => {
    setSelectedFileForFeedback(file);
    setFeedbackText("");
    setShowFeedbackDialog(true);
  };

  const handleFeedbackSubmit = async () => {
    if (!selectedFileForFeedback || !feedbackText.trim()) {
      toast({
        title: "Error",
        description: "Please enter feedback text",
        variant: "destructive",
      });
      return;
    }

    try {
      // Here you would typically save the feedback to the database
      // For now, we'll just show a success message
      toast({
        title: "Feedback submitted",
        description: `Feedback for "${selectedFileForFeedback.title}" has been submitted successfully.`,
      });
      
      setShowFeedbackDialog(false);
      setSelectedFileForFeedback(null);
      setFeedbackText("");
    } catch (error: any) {
      toast({
        title: "Error submitting feedback",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      });
    }
  };

  return (
    <AppLayout isAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Folders Management</h1>
          <div className="flex items-center gap-2">
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter by Semester</span>
                  {semesterFilter && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-primary"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setSemesterFilter("all")}>
                  All Semesters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSemesterFilter("1st Semester")}>
                  1st Semester
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSemesterFilter("2nd Semester")}>
                  2nd Semester
                </DropdownMenuItem>
                {semesterFilter && (
                  <>
                    <DropdownMenuItem 
                      onClick={clearFilter}
                      className="border-t mt-1 text-destructive"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear Filter
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={openCreateFolderDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Folder
            </Button>
          </div>
        </div>
        
        {(semesterFilter || schoolYearFilter) && (
          <div className="bg-muted/50 p-2 px-4 rounded-md flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Active filters:</span>
              {semesterFilter && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {semesterFilter === "all" ? "All Semesters" : semesterFilter}
                </span>
              )}
              {schoolYearFilter && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  School Year: {schoolYearFilter}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 gap-1">
              <X className="h-4 w-4" /> Clear All
            </Button>
          </div>
        )}
        
        <div className="space-y-4 rounded-md border bg-card/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2"
                onClick={() => setFolderPath([])}
              >
                <Home className="h-4 w-4 mr-1" />
                Root
                        </Button>
              {folderPath.map((folder, index) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleNavigateToBreadcrumb(index)}
                  >
                    {folder.name}
                        </Button>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                size="sm"
                className="gap-1"
                onClick={handleBackToParent}
                disabled={!currentFolder}
              >
                <ChevronLeft className="h-4 w-4" />
                Up
              </Button>
              <Button onClick={openCreateFolderDialog} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Folder
                        </Button>
                      </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentFolder ? `Viewing folders inside "${currentFolder.name}"` : "Viewing root-level folders"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="border rounded-xl p-4 bg-muted/30 animate-pulse h-36" />
            ))
          ) : filteredFolders.length === 0 ? (
            <div className="col-span-full border rounded-xl p-6 text-center text-muted-foreground bg-card/50">
              {semesterFilter
                ? "No folders found for the selected filters."
                : "No folders found in this directory. Create one to get started."}
            </div>
          ) : (
            filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className="border rounded-xl p-4 bg-card/70 hover:border-primary/60 transition group"
                onDoubleClick={() => handleEnterFolder(folder)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <Folder className="h-5 w-5" />
                    </div>
                    <div>
                      <button
                        type="button"
                        className="font-semibold text-base hover:text-primary transition"
                        onClick={() => handleEnterFolder(folder)}
                      >
                        {folder.name}
                      </button>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {folder.description || "No description provided."}
                      </p>
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground mt-2">
                        <span>{folder.semester || "No semester"}</span>
                        <span>•</span>
                        <span>
                          {folder.deadline ? format(new Date(folder.deadline), "PPP p") : "No deadline"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleView(folder)} title="View statistics">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(folder)}>
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                  <Button variant="outline" size="sm" className="text-destructive" onClick={() => confirmDelete(folder)}>
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {currentFolder && (
          <div className="rounded-md border bg-card/40 mt-6">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b">
              <div>
                <h3 className="font-semibold">Files in {currentFolder.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {documentsLoading ? "Loading files..." : `${folderDocuments.length} document${folderDocuments.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleView(currentFolder)}>
                <Eye className="h-4 w-4 mr-1" />
                View statistics
              </Button>
            </div>
            {documentsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading documents...</div>
            ) : folderDocuments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No documents inside this folder yet.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Document</TableHead>
                    <TableHead>Submitted By</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Uploaded</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {folderDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {doc.title}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{doc.profiles?.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground">{doc.profiles?.email}</div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            doc.status === "APPROVED"
                              ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                              : doc.status === "REJECTED"
                                ? "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                                : "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                          }`}
                        >
                          {doc.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(doc.created_at), "PPP p")}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
            )}
        </div>
        )}
        
        {/* Folder Form Dialog */}
        <Dialog open={formOpen} onOpenChange={setFormOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedFolder ? "Edit Folder" : "Create New Folder"}
              </DialogTitle>
              <DialogDescription>
                {selectedFolder 
                  ? "Update the folder information below."
                  : "Fill out the form to create a new folder."}
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Folder Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter folder name"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter folder description (optional)"
                  rows={3}
                />
              </div>
              
              {isRootContext && (
                <>
              <div className="space-y-2">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value) => setFormData({ ...formData, semester: value })}
                >
                  <SelectTrigger id="semester" className="w-full">
                    <SelectValue placeholder="Select semester (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1st Semester">1st Semester</SelectItem>
                    <SelectItem value="2nd Semester">2nd Semester</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Optional: Select the semester for this folder.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: normalizeDateTimeLocalValue(e.target.value) })}
                      step="60"
                />
                <p className="text-xs text-muted-foreground">
                  Optional deadline for this folder.
                </p>
                  </div>
                </>
              )}
              
              <div className="text-xs text-muted-foreground border rounded-md bg-muted/40 px-3 py-2 mt-2">
                {isRootContext
                  ? "Root folders require scheduling details for deadlines."
                  : `Parent folder: ${currentFolder?.name || "Parent"}`}
              </div>
              
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {selectedFolder ? "Update Folder" : "Create Folder"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        
        {/* View Folder Dialog */}
        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
             <DialogHeader>
               <DialogTitle>{viewedFolder?.name}</DialogTitle>
               <DialogDescription>
                 Folder statistics and information
               </DialogDescription>
             </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Statistics Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div 
                  className={`border rounded-lg p-4 bg-muted/50 cursor-pointer hover:bg-muted/70 transition-colors ${showInstructors ? 'col-span-2' : ''}`}
                  onClick={() => viewedFolder && (showInstructors ? setShowInstructors(false) : fetchInstructorsForFolder(viewedFolder.id))}
                >
                  <Label className="text-xs text-muted-foreground">Total Instructors</Label>
                  <p className="text-2xl font-bold mt-1">{folderStats.totalInstructors}</p>
                  <p className="text-xs text-primary mt-2">{showInstructors ? 'Hide list' : 'Click to view list'}</p>

                {showInstructors && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-sm">Instructors</h4>
                        {loadingInstructors && (
                          <span className="text-xs text-muted-foreground">Loading...</span>
                        )}
                      </div>
                      {instructors.length === 0 && !loadingInstructors ? (
                        <p className="text-sm text-muted-foreground">No instructors found.</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-auto pr-1">
                          {instructors.map((inst) => (
                            <div key={inst.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
                              <div>
                                <p className="text-sm font-medium">{inst.name}</p>
                                <p className="text-xs text-muted-foreground">{inst.email}</p>
                              </div>
                              <span className={
                                `text-xs px-2 py-0.5 rounded-full font-medium ${inst.submitted 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'}`
                              }>
                                {inst.submitted ? 'Submitted' : 'Not submitted'}
                              </span>
                            </div>
                          ))}
                        {archivedSubmitters.length > 0 && (
                          <div className="pt-3 mt-3 border-t">
                            <h5 className="text-xs font-semibold text-muted-foreground mb-2">Archived instructors who submitted</h5>
                            <div className="space-y-2">
                              {archivedSubmitters.map((p) => (
                                <div key={p.id} className="flex items-center justify-between py-1">
                                  <div>
                                    <p className="text-sm font-medium">{p.name}</p>
                                    <p className="text-xs text-muted-foreground">{p.email}</p>
                                  </div>
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-300">Archived</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Total Submissions</Label>
                  <p className="text-2xl font-bold mt-1">{folderStats.totalSubmissions}</p>
                </div>
                
                <div className="border rounded-lg p-4 bg-green-50 dark:bg-green-950/20">
                  <Label className="text-xs text-muted-foreground">Ontime</Label>
                  <p className="text-2xl font-bold mt-1 text-green-600 dark:text-green-400">
                    {folderStats.ontime}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 bg-red-50 dark:bg-red-950/20">
                  <Label className="text-xs text-muted-foreground">Late</Label>
                  <p className="text-2xl font-bold mt-1 text-red-600 dark:text-red-400">
                    {folderStats.late}
                  </p>
                </div>
                
                <div className="border rounded-lg p-4 bg-primary/10 col-span-2">
                  <Label className="text-xs text-muted-foreground">Submission Rate</Label>
                  <p className="text-2xl font-bold mt-1 text-primary">
                    {folderStats.rate}%
                  </p>
                </div>
               </div>
             </div>
             
             <DialogFooter className="flex gap-2">
               <Button 
                 variant="outline" 
                 onClick={() => viewedFolder && fetchDocumentUploaders(viewedFolder.id)}
                 disabled={loadingUploaders}
               >
                 {loadingUploaders ? (
                   <>
                     <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                     Loading...
                   </>
                 ) : (
                   <>
                     <FileText className="mr-2 h-4 w-4" />
                     Documents
                   </>
                 )}
               </Button>
               <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                 Close
               </Button>
             </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Document Uploaders Dialog */}
        <Dialog open={showUploadersDialog} onOpenChange={setShowUploadersDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Document Uploaders - {viewedFolder?.name}</DialogTitle>
              <DialogDescription>
                List of users who have uploaded documents to this folder
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {documentUploaders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No documents have been uploaded to this folder yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documentUploaders.map((uploader, index) => (
                    <div key={index} className="border rounded-lg bg-muted/30">
                      <div 
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => handleUserClick(uploader)}
                      >
                        <div className="flex-1">
                          <p className="font-medium text-primary hover:underline">{uploader.name}</p>
                          <p className="text-sm text-muted-foreground">{uploader.email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(uploader.uploaded_at), "MMM dd, yyyy 'at' h:mm a")}
                          </p>
                        </div>
                      </div>
                      
                      {/* Expanded user details */}
                      {selectedUser?.user_id === uploader.user_id && (
                        <div className="border-t p-4 bg-background/50">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-semibold text-lg">{uploader.name}'s Files</h4>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedUser(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          {loadingUserFiles ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-6 w-6 animate-spin mr-2" />
                              <span>Loading files...</span>
                            </div>
                          ) : userFiles.length === 0 ? (
                            <div className="text-center py-4 text-muted-foreground">
                              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p>No files uploaded by this user in this folder.</p>
                            </div>
                          ) : (
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
                                    {file.status === 'REJECTED' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleFeedbackClick(file)}
                                        className="flex items-center gap-1 text-orange-600 hover:text-orange-700 border-orange-200 hover:border-orange-300"
                                      >
                                        <MessageSquare className="h-3 w-3" />
                                        Feedback
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUploadersDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Confirm Deletion
              </AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete the folder "{selectedFolder?.name}"?
                <strong className="block mt-2 text-destructive">
                  This will also delete all documents assigned to this folder.
                </strong>
                This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Folder"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* File Viewer Modal */}
        <Dialog open={showFileViewer} onOpenChange={setShowFileViewer}>
          <DialogContent className="max-w-6xl max-h-[90vh] w-full">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedFile?.title}
              </DialogTitle>
              <DialogDescription>
                Document preview - {selectedFile ? getFileExtension(selectedFile.file_type, selectedFile.title) : 'FILE'}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0">
              {fileViewerUrl && (
                <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
                  {(() => {
                    const fileType = selectedFile?.file_type.toLowerCase() || '';
                    const fileName = selectedFile?.title.toLowerCase() || '';
                    
                    // PDF files
                    if (fileType.includes('pdf') || fileName.endsWith('.pdf')) {
                      return (
                        <iframe
                          src={fileViewerUrl}
                          className="w-full h-full"
                          title={selectedFile?.title}
                        />
                      );
                    }
                    
                    // Image files
                    if (fileType.includes('image') || 
                        fileName.match(/\.(jpg|jpeg|png|gif|bmp|webp|svg|ico|tiff)$/)) {
                      return (
                        <img
                          src={fileViewerUrl}
                          alt={selectedFile?.title}
                          className="w-full h-full object-contain"
                        />
                      );
                    }
                    
                    // Text files
                    if (fileType.includes('text') || 
                        fileName.match(/\.(txt|md|json|xml|csv|log|ini|conf)$/)) {
                      return (
                        <iframe
                          src={fileViewerUrl}
                          className="w-full h-full"
                          title={selectedFile?.title}
                        />
                      );
                    }
                    
                    // HTML files
                    if (fileType.includes('html') || fileName.endsWith('.html') || fileName.endsWith('.htm')) {
                      return (
                        <iframe
                          src={fileViewerUrl}
                          className="w-full h-full"
                          title={selectedFile?.title}
                        />
                      );
                    }
                    
                    // Office documents - try Google Docs viewer
                    if (fileType.includes('wordprocessingml') || 
                        fileType.includes('spreadsheetml') || 
                        fileType.includes('presentationml') ||
                        fileName.match(/\.(doc|docx|xls|xlsx|ppt|pptx)$/)) {
                      const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fileViewerUrl)}&embedded=true`;
                      return (
                        <div className="w-full h-full">
                          <iframe
                            src={googleViewerUrl}
                            className="w-full h-full"
                            title={selectedFile?.title}
                          />
                        </div>
                      );
                    }
                    
                    // Code files
                    if (fileName.match(/\.(js|ts|jsx|tsx|py|java|cpp|c|h|php|rb|go|rs|swift|kt|scala|r|sql|sh|bash|ps1|bat)$/)) {
                      return (
                        <iframe
                          src={fileViewerUrl}
                          className="w-full h-full"
                          title={selectedFile?.title}
                        />
                      );
                    }
                    
                    // Video files
                    if (fileType.includes('video') || 
                        fileName.match(/\.(mp4|avi|mov|wmv|flv|webm|mkv|3gp)$/)) {
                      return (
                        <video
                          src={fileViewerUrl}
                          controls
                          className="w-full h-full"
                          title={selectedFile?.title}
                        >
                          Your browser does not support the video tag.
                        </video>
                      );
                    }
                    
                    // Audio files
                    if (fileType.includes('audio') || 
                        fileName.match(/\.(mp3|wav|ogg|aac|flac|m4a|wma)$/)) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full bg-muted/30">
                          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                          <audio
                            src={fileViewerUrl}
                            controls
                            className="w-full max-w-md"
                            title={selectedFile?.title}
                          >
                            Your browser does not support the audio tag.
                          </audio>
                          <p className="text-sm text-muted-foreground mt-2">{selectedFile?.title}</p>
                        </div>
                      );
                    }
                    
                    // Archive files
                    if (fileName.match(/\.(zip|rar|7z|tar|gz|bz2)$/)) {
                      return (
                        <div className="flex flex-col items-center justify-center h-full bg-muted/30">
                          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Archive File</h3>
                          <p className="text-muted-foreground text-center mb-4">
                            This is an archive file. Please download it to extract and view its contents.
                          </p>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = fileViewerUrl;
                              link.download = selectedFile?.title || 'archive';
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Download Archive
                          </Button>
                        </div>
                      );
                    }
                    
                    // Default fallback - try iframe first, then show download option
                    return (
                      <div className="w-full h-full">
                        <iframe
                          src={fileViewerUrl}
                          className="w-full h-full"
                          title={selectedFile?.title}
                          onError={() => {
                            // If iframe fails, show download option
                            const iframe = document.querySelector('iframe[title="' + selectedFile?.title + '"]') as HTMLIFrameElement | null;
                            if (iframe) {
                              (iframe.style as CSSStyleDeclaration).display = 'none';
                              const fallbackDiv = iframe.nextElementSibling as HTMLElement | null;
                              if (fallbackDiv) {
                                fallbackDiv.style.display = 'flex';
                              }
                            }
                          }}
                        />
                        <div 
                          className="hidden flex-col items-center justify-center h-full bg-muted/30"
                          style={{ display: 'none' }}
                        >
                          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Preview Not Available</h3>
                          <p className="text-muted-foreground text-center mb-4">
                            This file type ({selectedFile ? getFileExtension(selectedFile.file_type, selectedFile.title) : 'FILE'}) cannot be previewed in the browser.
                          </p>
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = fileViewerUrl;
                              link.download = selectedFile?.title || 'document';
                              link.style.display = 'none';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="flex items-center gap-2"
                          >
                            <ExternalLink className="h-4 w-4" />
                            Download File
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFileViewer(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Feedback Dialog */}
        <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Provide Feedback
              </DialogTitle>
              <DialogDescription>
                Add feedback for the rejected document: {selectedFileForFeedback?.title}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="feedbackText">Feedback</Label>
                <Textarea
                  id="feedbackText"
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Enter your feedback for this rejected document..."
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Please provide constructive feedback to help improve the document.
                </p>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowFeedbackDialog(false);
                  setSelectedFileForFeedback(null);
                  setFeedbackText("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleFeedbackSubmit}
                disabled={!feedbackText.trim()}
              >
                Submit Feedback
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Folders;
