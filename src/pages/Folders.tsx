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
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import { Edit, Trash, Plus, Filter, X, Eye, AlertCircle } from "lucide-react";
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
  const [schoolYear, setSchoolYear] = useState<string>(""); // ✅ New School-Year state
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
  
  // ✅ Apply both Semester and School-Year filters
  useEffect(() => {
    let filtered = [...folders];

    if (semesterFilter && semesterFilter !== "all") {
      filtered = filtered.filter(folder => folder.semester === semesterFilter);
    }

    if (schoolYear.trim() !== "") {
      filtered = filtered.filter(folder => {
        if (!folder.deadline) return false;
        const year = new Date(folder.deadline).getFullYear().toString();
        return year.includes(schoolYear);
      });
    }

    setFilteredFolders(filtered);
  }, [semesterFilter, schoolYear, folders]);
  
  const clearFilter = () => {
    setSemesterFilter(null);
    setSchoolYear("");
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
        const { error } = await supabase
          .from("document_categories")
          .insert([payload]);
          
        if (error) throw error;
        
        toast({
          title: "Folder created",
          description: `${formData.name} has been created successfully.`,
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
    });
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (!selectedFolder) return;
    
    try {
      setIsDeleting(true);
      
      const { count } = await supabase
        .from("documents")
        .select("*", { count: "exact", head: true })
        .eq("category_id", selectedFolder.id);
      
      const { error } = await supabase
        .from("document_categories")
        .delete()
        .eq("id", selectedFolder.id);
        
      if (error) throw error;
      
      toast({
        title: "Folder deleted",
        description: count && count > 0 
          ? `${selectedFolder.name} and its ${count} associated documents have been deleted.`
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
      semester: "",
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

  const handleView = async (folder: Folder) => {
    setViewedFolder(folder);
    setViewDialogOpen(true);
  };

  return (
    <AppLayout isAdmin>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Folders Management</h1>

          <div className="flex items-center gap-2">
            {/* Semester Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="h-4 w-4" />
                  <span>Filter by Semester</span>
                  {(semesterFilter || schoolYear) && (
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
                {(semesterFilter || schoolYear) && (
                  <DropdownMenuItem 
                    onClick={clearFilter}
                    className="border-t mt-1 text-destructive"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Clear Filters
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* ✅ New School-Year Input */}
            <Input
              type="number"
              placeholder="School-Year (e.g. 2025)"
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value)}
              className="w-40"
            />

            {/* Add Folder Button */}
            <Button onClick={() => setFormOpen(true)} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add New Folder
            </Button>
          </div>
        </div>

        {/* Filter Info */}
        {(semesterFilter || schoolYear) && (
          <div className="bg-muted/50 p-2 px-4 rounded-md flex justify-between items-center text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Active filters:</span>
              {semesterFilter && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  {semesterFilter === "all" ? "All Semesters" : semesterFilter}
                </span>
              )}
              {schoolYear && (
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded">
                  Year: {schoolYear}
                </span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearFilter} className="h-8 gap-1">
              <X className="h-4 w-4" /> Clear
            </Button>
          </div>
        )}

        {/* Table */}
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
                    No folders found.
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
      </div>
    </AppLayout>
  );
};

export default Folders;
