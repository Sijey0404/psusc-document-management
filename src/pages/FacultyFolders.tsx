import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { format } from "date-fns";
import { Eye, Upload, Filter, X, Folder, ChevronRight, ChevronLeft, Home, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { DocumentCategory } from "@/types";
import { useSearchParams } from "react-router-dom";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

const FacultyFolders = () => {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const [searchParams] = useSearchParams();
  const folderIdFromUrl = searchParams.get('folder');
  
  const [folders, setFolders] = useState<DocumentCategory[]>([]);
  const [filteredFolders, setFilteredFolders] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<DocumentCategory | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [semesterFilter, setSemesterFilter] = useState<string | null>(null);
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderPath, setFolderPath] = useState<DocumentCategory[]>([]);
  const currentFolder = folderPath[folderPath.length - 1] || null;
  const [folderDocuments, setFolderDocuments] = useState<FolderDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [plainFolderDialogOpen, setPlainFolderDialogOpen] = useState(false);
  const [plainFolderName, setPlainFolderName] = useState("");
  const [plainFolderDescription, setPlainFolderDescription] = useState("");
  const [creatingPlainFolder, setCreatingPlainFolder] = useState(false);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      if (!profile?.department_id) {
        setFolders([]);
        setFilteredFolders([]);
        setLoading(false);
        toast({
          title: "Department not set",
          description: "Please contact the administrator to assign your department.",
          variant: "destructive",
        });
        return;
      }

      let query = (supabase as any)
        .from("document_categories")
        .select("id, name, description, deadline, created_at, updated_at, semester, parent_id")
        .eq("department_id", profile.department_id)
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
      
      if (folderIdFromUrl && data) {
        const folderToOpen = data.find(folder => folder.id === folderIdFromUrl);
        if (folderToOpen) {
          handleViewFolder(folderToOpen);
        }
      }
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
  }, [profile?.department_id, currentFolder?.id]);

  useEffect(() => {
    setFolderPath([]);
  }, [profile?.department_id]);

  useEffect(() => {
    const openFolderFromQuery = async () => {
      if (!folderIdFromUrl || !profile?.department_id || folderPath.length > 0) return;
      
      const { data, error } = await (supabase as any)
        .from("document_categories")
        .select("id, name, description, deadline, created_at, updated_at, semester, parent_id")
        .eq("department_id", profile.department_id)
        .eq("id", folderIdFromUrl)
        .maybeSingle();
      
      if (!error && data) {
        setFolderPath([data as DocumentCategory]);
      }
    };
    
    openFolderFromQuery();
  }, [folderIdFromUrl, profile?.department_id, folderPath.length]);
  
  useEffect(() => {
    let filtered = folders;

    if (semesterFilter) {
      filtered = filtered.filter(folder =>
        semesterFilter === "all" || folder.semester === semesterFilter
      );
    }

    if (schoolYearFilter.trim() !== "") {
      filtered = filtered.filter(folder => {
        if (!folder.deadline) return false;
        const deadlineYear = new Date(folder.deadline).getFullYear().toString();
        return deadlineYear.includes(schoolYearFilter.trim());
      });
    }

    setFilteredFolders(filtered);
  }, [semesterFilter, schoolYearFilter, folders]);
  
  const clearFilter = () => {
    setSemesterFilter(null);
    setSchoolYearFilter("");
  };

  const handleEnterFolder = (folder: DocumentCategory) => {
    setFolderPath((prev) => [...prev, folder]);
  };

  const handleNavigateToBreadcrumb = (index: number) => {
    setFolderPath((prev) => prev.slice(0, index + 1));
  };

  const handleBackToParent = () => {
    if (folderPath.length === 0) return;
    setFolderPath((prev) => prev.slice(0, -1));
  };

  const handleViewFolder = (folder: DocumentCategory) => {
    setSelectedFolder(folder);
    setIsDialogOpen(true);
    setDocumentDescription("");
    setSelectedFile(null);
    setDocumentTitle("");
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedFolder(null);
    setSelectedFile(null);
    setDocumentDescription("");
    setDocumentTitle("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePlainFolderCreate = async () => {
    if (!currentFolder?.id || !profile?.department_id || !plainFolderName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide a folder name.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCreatingPlainFolder(true);
      const { error } = await (supabase as any)
        .from("document_categories")
        .insert({
          name: plainFolderName.trim(),
          description: plainFolderDescription.trim() || null,
          department_id: profile.department_id,
          parent_id: currentFolder.id,
          deadline: null,
          semester: null,
        });

      if (error) throw error;

      toast({
        title: "Folder created",
        description: `"${plainFolderName.trim()}" has been added under ${currentFolder.name}.`,
      });

      setPlainFolderName("");
      setPlainFolderDescription("");
      setPlainFolderDialogOpen(false);
      fetchFolders();
    } catch (error: any) {
      toast({
        title: "Failed to create folder",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreatingPlainFolder(false);
    }
  };

  const fetchFolderDocuments = async (folderId: string) => {
    if (!profile?.department_id) return;
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
        .eq("department_id", profile.department_id)
        .eq("category_id", folderId)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setFolderDocuments((data as FolderDocument[]) || []);
    } catch (error: any) {
      console.error("Error loading folder documents:", error);
      toast({
        title: "Error",
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
  }, [currentFolder?.id, profile?.department_id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files.length) {
      setSelectedFile(null);
      return;
    }
    const file = e.target.files[0];
    setSelectedFile(file);
    setDocumentTitle(file.name.replace(/\.[^/.]+$/, "")); // Automatically use file name as title (without extension)
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedFolder || !profile) return;

    try {
      setUploading(true);
      const filePath = `documents/${selectedFolder.id}/${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      const { error: dbError } = await supabase.from("documents").insert({
        title: documentTitle,
        description: documentDescription,
        file_path: filePath,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        category_id: selectedFolder.id,
        status: "PENDING",
        department_id: profile.department_id,
        submitted_by: profile.id
      });
      
      if (dbError) throw dbError;
      
      toast({
        title: "Upload successful",
        description: `Document "${documentTitle}" uploaded to ${selectedFolder.name}`,
      });
      
      setDocumentDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      handleCloseDialog();
      if (currentFolder?.id === selectedFolder.id) {
        fetchFolderDocuments(currentFolder.id);
      }
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Folders Management</h1>
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter</span>
                  {(semesterFilter || schoolYearFilter) && (
                    <span className="ml-1 h-2 w-2 rounded-full bg-primary"></span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-2 space-y-2">
                <div className="px-2">
                  <Label className="text-xs text-muted-foreground">Semester</Label>
                </div>
                <DropdownMenuItem onClick={() => setSemesterFilter("all")}>
                  All Semesters
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSemesterFilter("1st Semester")}>
                  1st Semester
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSemesterFilter("2nd Semester")}>
                  2nd Semester
                </DropdownMenuItem>

                <div className="px-2 pt-2">
                  <Label htmlFor="schoolYearFilter" className="text-xs text-muted-foreground">
                    School Year
                  </Label>
                  <Input
                    id="schoolYearFilter"
                    placeholder="e.g. 2025"
                    value={schoolYearFilter}
                    onChange={(e) => setSchoolYearFilter(e.target.value)}
                    className="mt-1 h-8"
                  />
                </div>

                {(semesterFilter || schoolYearFilter) && (
                  <DropdownMenuItem 
                    onClick={clearFilter}
                    className="border-t mt-1 text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {(semesterFilter || schoolYearFilter) && (
          <div className="bg-muted/50 p-2 px-4 rounded-md flex justify-between items-center text-sm">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Active filter:</span>
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
              <X className="h-4 w-4" /> Clear
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
              {currentFolder && (
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1"
                  onClick={() => setPlainFolderDialogOpen(true)}
                >
                  <Folder className="h-4 w-4" />
                  New Subfolder
                </Button>
              )}
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            {currentFolder ? `Viewing folders inside "${currentFolder.name}"` : "Viewing root-level folders"}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {loading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="border rounded-xl p-4 bg-muted/30 animate-pulse h-32" />
            ))
          ) : filteredFolders.length === 0 ? (
            <div className="col-span-full border rounded-xl p-6 text-center text-muted-foreground bg-card/50">
              No folders found in this directory.
            </div>
          ) : (
            filteredFolders.map((folder) => (
              <div
                key={folder.id}
                className="border rounded-xl p-4 bg-card/70 hover:border-primary/60 transition group cursor-pointer"
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
                  <Button variant="outline" size="sm" onClick={() => handleViewFolder(folder)}>
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
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
              <Button variant="ghost" size="sm" onClick={() => handleViewFolder(currentFolder)}>
                <Upload className="h-4 w-4 mr-1" />
                Upload here
              </Button>
            </div>
            {documentsLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading documents...</div>
            ) : folderDocuments.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No documents uploaded to this folder yet.</div>
            ) : (
              <div className="divide-y">
                {folderDocuments.map((doc) => (
                  <div key={doc.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-sm">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.profiles?.name || "Unknown"} • {format(new Date(doc.created_at), "PPP p")}
                        </p>
                      </div>
                    </div>
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
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedFolder?.name} Folder
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedFolder?.description}
              </p>
              {selectedFolder?.semester && (
                <p className="text-sm">
                  <strong>Semester:</strong> {selectedFolder.semester}
                </p>
              )}
              {selectedFolder?.deadline && (
                <p className="text-sm">
                  <strong>Deadline:</strong>{" "}
                  {format(new Date(selectedFolder.deadline), "PPP p")}
                </p>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="documentDescription">Description</Label>
                <Textarea
                  id="documentDescription"
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  placeholder="Enter document description (optional)"
                  rows={3}
                />
              </div>
              
              <div className="flex flex-col items-center gap-4 py-4">
                <Input 
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  disabled={uploading}
                />
                
                <div 
                  className="flex items-center justify-center border-2 border-dashed rounded-lg p-6 bg-muted/30 cursor-pointer w-full"
                  onClick={triggerFileInput}
                >
                  <div className="text-center">
                    <Upload className="h-10 w-10 text-muted-foreground mb-2 mx-auto" />
                    <p className="text-muted-foreground mb-1">
                      Click to browse or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Supported formats: PDF, DOCX, JPG, PNG
                    </p>
                    {selectedFile && (
                      <div className="mt-4 p-2 bg-muted rounded-md">
                        <p className="text-sm font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button 
                onClick={handleCloseDialog}
                variant="outline"
                className="mr-2"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={plainFolderDialogOpen} onOpenChange={setPlainFolderDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Subfolder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="plainFolderName">Folder Name</Label>
              <Input
                id="plainFolderName"
                value={plainFolderName}
                onChange={(e) => setPlainFolderName(e.target.value)}
                placeholder="Untitled folder"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plainFolderDescription">Description</Label>
              <Textarea
                id="plainFolderDescription"
                value={plainFolderDescription}
                onChange={(e) => setPlainFolderDescription(e.target.value)}
                placeholder="Optional description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlainFolderDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handlePlainFolderCreate} disabled={creatingPlainFolder}>
              {creatingPlainFolder ? "Creating..." : "Create Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FacultyFolders;
