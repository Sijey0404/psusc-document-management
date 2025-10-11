
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
import { Edit, Trash, Plus, Folder, AlertCircle, Filter, X, Eye, FileText, Loader2, Download, ExternalLink } from "lucide-react";
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
};

const Folders = () => {
  const { toast } = useToast();
  
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
  
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    deadline: "",
    semester: "",
  });

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("document_categories")
        .select("*, semester")
        .order("name");
        
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
  }, []);
  
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        deadline: formData.deadline || null,
        semester: formData.semester || null,
      };
      
      if (selectedFolder) {
        // Update existing folder
        const { error } = await supabase
          .from("document_categories")
          .update(payload)
          .eq("id", selectedFolder.id);
          
        if (error) throw error;
        
        toast({
          title: "Folder updated",
          description: `${formData.name} has been updated successfully.`,
        });
      } else {
        // Create new folder
        const { data: newFolder, error } = await supabase
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
      semester: folder.semester || "", // Ensure it's "" if null for Select value
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
        .eq("category_id", selectedFolder.id);
        
      if (countError) throw countError;
      
      // Delete the folder (this will now cascade delete documents)
      const { error } = await supabase
        .from("document_categories")
        .delete()
        .eq("id", selectedFolder.id);
        
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
      name: "",
      description: "",
      deadline: "",
      semester: "", // Reset to empty string
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

  const handleView = async (folder: Folder) => {
    setViewedFolder(folder);
    setViewDialogOpen(true);
    
    try {
      // Fetch total instructors (faculty members) - only active accounts
      const { count: instructorCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", false)
        .eq("archived", false);
      
      // Fetch all submissions for this folder
      const { data: submissions, error } = await supabase
        .from("documents")
        .select("created_at")
        .eq("category_id", folder.id);
        
      if (error) throw error;
      
      const totalSubmissions = submissions?.length || 0;
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
        totalInstructors: instructorCount || 0,
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

  const fetchDocumentUploaders = async (folderId: string) => {
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
    try {
      setLoadingUserFiles(true);
      const { data, error } = await supabase
        .from("documents")
        .select("title, status, created_at, file_type, file_path")
        .eq("category_id", folderId)
        .eq("submitted_by", userId)
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

  const handleDocumentDownload = async (filePath: string, fileName: string) => {
    try {
      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (error) throw error;
      
      // Create a blob URL and trigger download
      const url = window.URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Error downloading file",
        description: error.message || "Failed to download the file",
        variant: "destructive",
      });
    }
  };

  const handleDocumentView = async (filePath: string, fileName: string) => {
    try {
      // Get the file from Supabase storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(filePath);
      
      if (error) throw error;
      
      // Create a blob URL and open in new tab
      const url = window.URL.createObjectURL(data);
      window.open(url, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error: any) {
      toast({
        title: "Error viewing file",
        description: error.message || "Failed to open the file",
        variant: "destructive",
      });
    }
  };

  const getFileExtension = (fileType: string) => {
    if (fileType.includes('pdf')) return 'PDF';
    if (fileType.includes('wordprocessingml')) return 'DOCX';
    if (fileType.includes('presentationml')) return 'PPTX';
    if (fileType.includes('spreadsheetml')) return 'XLSX';
    if (fileType.includes('image')) return 'IMAGE';
    return 'FILE';
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
            <Button onClick={() => setFormOpen(true)} className="flex items-center gap-2">
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
        
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Loading folders...
                  </TableCell>
                </TableRow>
              ) : filteredFolders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {semesterFilter ? "No folders found for the selected semester." : "No folders found. Create one to get started."}
                  </TableCell>
                </TableRow>
              ) : (
                filteredFolders.map((folder) => (
                  <TableRow key={folder.id}>
                    <TableCell className="font-medium">{folder.name}</TableCell>
                    <TableCell>{folder.description || "-"}</TableCell>
                    <TableCell>{folder.semester || "-"}</TableCell>
                    <TableCell>
                      {folder.deadline 
                        ? format(new Date(folder.deadline), "PPP p") 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleView(folder)}
                          title="View folder"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleEdit(folder)}
                          title="Edit folder"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => confirmDelete(folder)}
                          title="Delete folder"
                          className="text-destructive"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
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
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Optional deadline for this folder.
                </p>
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
                <div className="border rounded-lg p-4 bg-muted/50">
                  <Label className="text-xs text-muted-foreground">Total Instructors</Label>
                  <p className="text-2xl font-bold mt-1">{folderStats.totalInstructors}</p>
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
                                <div 
                                  key={fileIndex} 
                                  className="p-3 border rounded-lg bg-muted/30"
                                >
                                  <div className="flex items-start justify-between mb-2">
                                    <div className="flex-1">
                                      <p className="font-medium">{file.title}</p>
                                      <p className="text-sm text-muted-foreground">
                                        Submitted to "{viewedFolder?.name}" • {getFileExtension(file.file_type)} • {format(new Date(file.created_at), "MMM dd, yyyy 'at' h:mm a")}
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
                                      onClick={() => handleDocumentView(file.file_path, file.title)}
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
      </div>
    </AppLayout>
  );
};

export default Folders;
