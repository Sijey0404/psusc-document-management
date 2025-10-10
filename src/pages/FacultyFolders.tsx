
import { useState, useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from "@/components/ui/table";
import { format } from "date-fns";
import { Eye, Upload, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/AuthContext";
import { DocumentCategory } from "@/types"; // Using DocumentCategory which will have semester
import { useSearchParams } from "react-router-dom";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      // Select semester along with other fields
      const { data, error } = await supabase
        .from("document_categories")
        .select("id, name, description, deadline, created_at, updated_at, semester") 
        .order("name");
        
      if (error) throw error;
      
      setFolders(data || []);
      setFilteredFolders(data || []);
      
      // If we have a folder ID from the URL, find and open that folder
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
  }, [folderIdFromUrl]); // Re-fetch when the folder ID in the URL changes
  
  // Apply filters when semesterFilter changes
  useEffect(() => {
    if (semesterFilter) {
      const filtered = folders.filter(folder => 
        semesterFilter === "all" || folder.semester === semesterFilter
      );
      setFilteredFolders(filtered);
    } else {
      setFilteredFolders(folders);
    }
  }, [semesterFilter, folders]);
  
  // Debug button state
  useEffect(() => {
    console.log("Button state debug:", { 
      uploading, 
      documentTitleTrimmed: documentTitle.trim(), 
      selectedFile: selectedFile?.name || null, 
      buttonDisabled: uploading || !documentTitle.trim() || !selectedFile 
    });
  }, [uploading, documentTitle, selectedFile]);
  
  const clearFilter = () => {
    setSemesterFilter(null);
  };

  const handleViewFolder = (folder: DocumentCategory) => {
    setSelectedFolder(folder);
    setIsDialogOpen(true);
    setDocumentTitle("");
    setDocumentDescription("");
    setSelectedFile(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedFolder(null);
    setSelectedFile(null);
    setDocumentTitle("");
    setDocumentDescription("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File change event triggered", e.target.files);
    if (!e.target.files || !e.target.files.length) {
      console.log("No file selected, setting to null");
      setSelectedFile(null);
      return;
    }
    
    const file = e.target.files[0];
    console.log("File selected:", file.name, file.size);
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    console.log("handleUpload called", { selectedFile: selectedFile?.name, selectedFolder: selectedFolder?.name, profile: profile?.name });
    if (!selectedFile || !selectedFolder || !profile) {
      console.log("Early return due to missing:", { selectedFile: !!selectedFile, selectedFolder: !!selectedFolder, profile: !!profile });
      return;
    }
    
    // Validate required fields
    if (!documentTitle.trim()) {
      toast({
        title: "Required field missing",
        description: "Please enter a document title",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setUploading(true);
      
      // Construct a file path including the folder name to organize uploads
      const filePath = `documents/${selectedFolder.id}/${selectedFile.name}`;
      
      // Upload the file
      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Record the document in the database
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
      
      // Reset form fields and close dialog
      setDocumentTitle("");
      setDocumentDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      handleCloseDialog();
      
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
          </div>
        </div>
        
        {semesterFilter && (
          <div className="bg-muted/50 p-2 px-4 rounded-md flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Active filter:</span>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                {semesterFilter === "all" ? "All Semesters" : semesterFilter}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 gap-1">
              <X className="h-4 w-4" /> Clear
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
                    {semesterFilter ? "No folders found for the selected semester." : "No folders found."}
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
                          title="View folder"
                          onClick={() => handleViewFolder(folder)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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
              {selectedFolder?.semester && ( // Display semester in dialog
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
                <Label htmlFor="documentTitle">Document Title <span className="text-red-500">*</span></Label>
                <Input
                  id="documentTitle"
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  placeholder="Enter document title"
                  required
                />
              </div>
              
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
                disabled={uploading || !documentTitle.trim() || !selectedFile}
              >
                {uploading ? "Uploading..." : "Upload Document"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default FacultyFolders;
