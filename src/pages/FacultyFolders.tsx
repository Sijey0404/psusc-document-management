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
import { DocumentCategory } from "@/types";
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
  const [schoolYearFilter, setSchoolYearFilter] = useState<string>(""); // ✅ New filter for deadline year
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documentTitle, setDocumentTitle] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fetchFolders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("document_categories")
        .select("id, name, description, deadline, created_at, updated_at, semester")
        .order("name");
        
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
  }, [folderIdFromUrl]);

  // ✅ Combined filter for semester + school year
  useEffect(() => {
    let filtered = folders;

    // Filter by semester
    if (semesterFilter && semesterFilter !== "all") {
      filtered = filtered.filter(folder => folder.semester === semesterFilter);
    }

    // Filter by School Year (Deadline Year)
    if (schoolYearFilter.trim() !== "") {
      filtered = filtered.filter(folder => {
        if (!folder.deadline) return false;
        const folderYear = new Date(folder.deadline).getFullYear().toString();
        return folderYear.includes(schoolYearFilter.trim());
      });
    }

    setFilteredFolders(filtered);
  }, [semesterFilter, schoolYearFilter, folders]);

  const clearFilter = () => {
    setSemesterFilter(null);
    setSchoolYearFilter("");
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
    if (!e.target.files || !e.target.files.length) {
      setSelectedFile(null);
      return;
    }
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedFolder || !profile) return;
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
      
      setDocumentTitle("");
      setDocumentDescription("");
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Folders Management</h1>
          <div className="flex items-center gap-3 flex-wrap">
            {/* ✅ School Year Filter Input */}
            <div className="flex items-center gap-2">
              <Label htmlFor="schoolYear" className="text-sm font-medium">
                School Year
              </Label>
              <Input
                id="schoolYear"
                type="text"
                placeholder="e.g. 2025"
                value={schoolYearFilter}
                onChange={(e) => setSchoolYearFilter(e.target.value)}
                className="w-28"
              />
              {schoolYearFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSchoolYearFilter("")}
                  className="h-8 text-muted-foreground"
                >
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
            </div>

            {/* ✅ Semester Filter */}
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
                    No folders found for the selected filters.
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

      {/* Dialog for Upload */}
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
                <Label htmlFor="documentTitle">
                  Document Title <span className="text-red-500">*</span>
                </Label>
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
