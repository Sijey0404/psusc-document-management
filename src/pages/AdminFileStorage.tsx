import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileText, Trash2, Download, Search, HardDrive, Folder, FolderPlus, ChevronRight, Home, Eye } from "lucide-react";
import { AdminFileViewer } from "@/components/document/AdminFileViewer";

interface AdminFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  folder_path: string;
  created_at: string;
}

const AdminFileStorage = () => {
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const [files, setFiles] = useState<AdminFile[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<AdminFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [fileToDelete, setFileToDelete] = useState<AdminFile | null>(null);
  const [currentPath, setCurrentPath] = useState("/");
  const [folders, setFolders] = useState<string[]>([]);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [fileToView, setFileToView] = useState<AdminFile | null>(null);

  useEffect(() => {
    if (user && isAdmin) {
      fetchFiles();
    }
  }, [user, isAdmin, currentPath]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = files.filter(file =>
        file.file_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredFiles(filtered);
    } else {
      setFilteredFiles(files);
    }
  }, [searchQuery, files]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('admin_files' as any)
        .select('*')
        .eq('user_id', user?.id)
        .eq('folder_path', currentPath)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const allFiles = (data as any) || [];
      setFiles(allFiles);
      
      // Extract unique folders in current path
      const { data: allData } = await supabase
        .from('admin_files' as any)
        .select('folder_path')
        .eq('user_id', user?.id);
      
      const subfolders = new Set<string>();
      (allData as any)?.forEach((item: any) => {
        const path = item.folder_path;
        if (path.startsWith(currentPath) && path !== currentPath) {
          const relativePath = path.substring(currentPath.length);
          const nextFolder = relativePath.split('/').filter(Boolean)[0];
          if (nextFolder) {
            subfolders.add(nextFolder);
          }
        }
      });
      
      setFolders(Array.from(subfolders));
    } catch (error: any) {
      console.error("Error fetching files:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load files",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select a file smaller than 50MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const storagePath = currentPath === '/' 
        ? `${user.id}/${fileName}`
        : `${user.id}${currentPath}${fileName}`;
      const filePath = storagePath;

      const { error: uploadError } = await supabase.storage
        .from('admin-files')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('admin_files' as any)
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          file_type: file.type,
          folder_path: currentPath,
        });

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File uploaded successfully",
      });

      fetchFiles();
      event.target.value = '';
    } catch (error: any) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (file: AdminFile) => {
    try {
      const { data, error } = await supabase.storage
        .from('admin-files')
        .download(file.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.file_name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

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
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('admin-files')
        .remove([fileToDelete.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('admin_files' as any)
        .delete()
        .eq('id', fileToDelete.id);

      if (dbError) throw dbError;

      toast({
        title: "Success",
        description: "File deleted successfully",
      });

      fetchFiles();
      setFileToDelete(null);
    } catch (error: any) {
      console.error("Error deleting file:", error);
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete file",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) return;

    const newPath = currentPath === '/' 
      ? `/${newFolderName}/`
      : `${currentPath}${newFolderName}/`;

    try {
      // Create a placeholder file to represent the folder
      const { error } = await supabase
        .from('admin_files' as any)
        .insert({
          user_id: user.id,
          file_name: '.folder',
          file_path: `${user.id}${newPath}.folder`,
          file_size: 0,
          file_type: 'folder',
          folder_path: newPath,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Folder created successfully",
      });

      setNewFolderName("");
      setShowCreateFolder(false);
      fetchFiles();
    } catch (error: any) {
      console.error("Error creating folder:", error);
      toast({
        title: "Failed to create folder",
        description: error.message || "Failed to create folder",
        variant: "destructive",
      });
    }
  };

  const navigateToFolder = (folderName: string) => {
    const newPath = currentPath === '/' 
      ? `/${folderName}/`
      : `${currentPath}${folderName}/`;
    setCurrentPath(newPath);
  };

  const navigateUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    setCurrentPath(parts.length === 0 ? '/' : `/${parts.join('/')}/`);
  };

  const getPathBreadcrumbs = () => {
    if (currentPath === '/') return [];
    return currentPath.split('/').filter(Boolean);
  };

  if (!isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-96">
          <p>Access denied. Admin privileges required.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <HardDrive className="h-6 w-6 text-primary" />
              <CardTitle>My Personal Storage</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreateFolder(true)}
                variant="outline"
                className="gap-2"
              >
                <FolderPlus className="h-4 w-4" />
                New Folder
              </Button>
              <Input
                type="file"
                id="file-upload"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              <Button
                onClick={() => document.getElementById('file-upload')?.click()}
                disabled={uploading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {uploading ? "Uploading..." : "Upload File"}
              </Button>
            </div>
          </div>
          
          {/* Breadcrumb Navigation */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPath('/')}
              className="h-8 px-2"
            >
              <Home className="h-4 w-4" />
            </Button>
            {getPathBreadcrumbs().map((folder, index) => (
              <div key={index} className="flex items-center gap-2">
                <ChevronRight className="h-4 w-4" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const parts = getPathBreadcrumbs().slice(0, index + 1);
                    setCurrentPath(`/${parts.join('/')}/`);
                  }}
                  className="h-8"
                >
                  {folder}
                </Button>
              </div>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search files..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <p>Loading...</p>
            </div>
          ) : folders.length > 0 || filteredFiles.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Modified</TableHead>
                    <TableHead className="w-[120px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Show folders first */}
                  {folders.map((folder) => (
                    <TableRow 
                      key={folder}
                      className="cursor-pointer hover:bg-accent"
                      onClick={() => navigateToFolder(folder)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Folder className="h-4 w-4 text-primary" />
                          <span className="font-medium">{folder}</span>
                        </div>
                      </TableCell>
                      <TableCell>-</TableCell>
                      <TableCell>-</TableCell>
                      <TableCell></TableCell>
                    </TableRow>
                  ))}
                  
                  {/* Then show files */}
                  {filteredFiles.map((file) => (
                    <TableRow key={file.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="truncate max-w-md">{file.file_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>{formatFileSize(file.file_size)}</TableCell>
                      <TableCell>{formatDate(file.created_at)}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFileToView(file)}
                            title="View file"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(file)}
                            title="Download file"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setFileToDelete(file)}
                            title="Delete file"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <HardDrive className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No files or folders yet</p>
              <p className="text-muted-foreground">
                {searchQuery ? "No items match your search" : "Create a folder or upload your first file to get started"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{fileToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Viewer Modal */}
      <Dialog open={!!fileToView} onOpenChange={() => setFileToView(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>File Viewer</DialogTitle>
          </DialogHeader>
          {fileToView && (
            <AdminFileViewer 
              filePath={fileToView.file_path}
              fileType={fileToView.file_type}
              fileName={fileToView.file_name}
            />
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default AdminFileStorage;
