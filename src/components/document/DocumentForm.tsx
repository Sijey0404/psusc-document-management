
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { FileUploader } from "./FileUploader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DocumentFormProps {
  formData: {
    title: string;
    description: string;
    selectedDepartment: string;
    selectedCategory: string;
    selectedFolder: string;
    file: File | null;
  };
  formOptions: {
    departments: { id: string; name: string }[];
    categories: { id: string; name: string }[];
    folderOptions: { id: string; name: string; deadline: string | null }[];
  };
  fileError: string;
  isSubmitting: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFormSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onUpdateField: (field: string, value: string) => void;
  getFolderDeadlineInfo: (folderId: string) => string | null;
}

export const DocumentForm = ({
  formData,
  formOptions,
  fileError,
  isSubmitting,
  onFileChange,
  onFormSubmit,
  onCancel,
  onUpdateField,
  getFolderDeadlineInfo
}: DocumentFormProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Information</CardTitle>
        <CardDescription>
          Complete the form below to submit your document.
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={onFormSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title <span className="text-red-500">*</span></Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => onUpdateField("title", e.target.value)}
              placeholder="Document title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => onUpdateField("description", e.target.value)}
              placeholder="Add a brief description of the document (optional)"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.selectedDepartment} 
                onValueChange={(value) => onUpdateField("selectedDepartment", value)}
              >
                <SelectTrigger id="department">
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {formOptions.departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Category <span className="text-red-500">*</span></Label>
              <Select 
                value={formData.selectedCategory} 
                onValueChange={(value) => onUpdateField("selectedCategory", value)}
              >
                <SelectTrigger id="category">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-48">
                    {formOptions.categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="folder">Folder (Optional)</Label>
            <Select 
              value={formData.selectedFolder} 
              onValueChange={(value) => onUpdateField("selectedFolder", value)}
            >
              <SelectTrigger id="folder">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {formOptions.folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formData.selectedFolder && formData.selectedFolder !== "none" && getFolderDeadlineInfo(formData.selectedFolder) && (
              <p className="text-xs text-amber-600">
                Deadline: {getFolderDeadlineInfo(formData.selectedFolder)}
              </p>
            )}
          </div>
          
          <FileUploader
            file={formData.file}
            fileError={fileError}
            onChange={onFileChange}
          />
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Document"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
