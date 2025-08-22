
import { Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface FileUploaderProps {
  file: File | null;
  fileError: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const FileUploader = ({ file, fileError, onChange }: FileUploaderProps) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="file">Document File <span className="text-red-500">*</span></Label>
      <div className="border-2 border-dashed rounded-md p-6 text-center">
        <Input
          id="file"
          type="file"
          onChange={onChange}
          className="hidden"
        />
        <Label htmlFor="file" className="cursor-pointer flex flex-col items-center">
          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
          <span className="font-medium">Click to browse or drag and drop</span>
          <span className="text-sm text-muted-foreground mt-1">
            Supported formats: PDF, DOCX, JPG, PNG (Max: 10MB)
          </span>
        </Label>
        {file && (
          <div className="mt-4 p-2 bg-muted rounded-md">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        )}
        {fileError && (
          <p className="text-sm text-red-500 mt-2">{fileError}</p>
        )}
      </div>
    </div>
  );
};
