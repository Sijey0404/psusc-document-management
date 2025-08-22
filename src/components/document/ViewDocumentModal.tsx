
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DocumentViewer } from "./DocumentViewer";

interface ViewDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  filePath: string;
  fileType: string;
  fileName: string;
}

export const ViewDocumentModal = ({
  isOpen,
  onClose,
  filePath,
  fileType,
  fileName,
}: ViewDocumentModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Document Viewer</DialogTitle>
        </DialogHeader>
        <DocumentViewer 
          filePath={filePath}
          fileType={fileType}
          fileName={fileName}
        />
      </DialogContent>
    </Dialog>
  );
};
