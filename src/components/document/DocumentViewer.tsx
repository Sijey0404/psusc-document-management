
import { useState, useEffect } from "react";
import { FileText, Loader } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface DocumentViewerProps {
  filePath: string;
  fileType: string;
  fileName: string;
}

export const DocumentViewer = ({ filePath, fileType, fileName }: DocumentViewerProps) => {
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFileUrl = async () => {
      try {
        setLoading(true);
        
        // Get a signed URL for the file that expires in 1 hour
        const { data, error } = await supabase.storage
          .from('documents')
          .createSignedUrl(filePath, 3600);
        
        if (error) {
          throw error;
        }
        
        if (data?.signedUrl) {
          setFileUrl(data.signedUrl);
        }
      } catch (err: any) {
        console.error("Error fetching file URL:", err);
        setError(err.message || "Failed to load document");
      } finally {
        setLoading(false);
      }
    };

    fetchFileUrl();
  }, [filePath]);

  const renderViewer = () => {
    if (loading) {
      return (
        <motion.div 
          className="flex flex-col items-center justify-center h-96"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="relative flex items-center justify-center mb-4">
            <div className="absolute border-t-2 border-primary h-12 w-12 rounded-full animate-spin"></div>
            <div className="absolute border-primary border-2 h-12 w-12 rounded-full opacity-25"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading document...</p>
        </motion.div>
      );
    }

    if (error) {
      return (
        <motion.div 
          className="flex flex-col items-center justify-center h-96 text-destructive"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FileText className="h-12 w-12 mb-4" />
          <p className="font-medium">Error loading document</p>
          <p className="text-sm mt-2">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      );
    }

    if (!fileUrl) {
      return (
        <motion.div 
          className="flex flex-col items-center justify-center h-96"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Document not available</p>
        </motion.div>
      );
    }

    // File type handling
    if (fileType.includes('pdf')) {
      return (
        <motion.div 
          className="h-[600px] w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <iframe
            src={`${fileUrl}#toolbar=1&navpanes=1`}
            title={fileName}
            className="w-full h-full border-0 rounded-md shadow-sm"
          />
        </motion.div>
      );
    } else if (
      fileType.includes('image/') ||
      fileType.includes('jpg') ||
      fileType.includes('jpeg') ||
      fileType.includes('png') ||
      fileType.includes('gif')
    ) {
      return (
        <motion.div 
          className="flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[600px] object-contain rounded-md shadow-sm"
          />
        </motion.div>
      );
    } else if (
      fileType.includes('text/') ||
      fileType.includes('txt') ||
      fileType.includes('json') ||
      fileType.includes('md')
    ) {
      return (
        <motion.iframe
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          src={fileUrl}
          title={fileName}
          className="w-full h-[600px] border-0 rounded-md shadow-sm"
        />
      );
    } else if (
      fileType.includes('word') || 
      fileType.includes('document') || 
      fileType.includes('docx') || 
      fileType.includes('doc')
    ) {
      return (
        <motion.div 
          className="flex flex-col items-center justify-center h-96"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-primary/5 rounded-full p-6 mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <p className="text-center max-w-md">
            Microsoft Word documents can be downloaded and viewed in Microsoft Office or Google Docs.
          </p>
          <div className="flex gap-4 mt-6">
            <a 
              href={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}`}
              target="_blank"
              rel="noreferrer"
              className="text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
            >
              View in Google Docs
            </a>
            <a 
              href={fileUrl}
              download={fileName}
              className="border border-primary text-primary hover:bg-primary/5 px-4 py-2 rounded-md transition-colors"
            >
              Download
            </a>
          </div>
        </motion.div>
      );
    } else {
      // Default fallback for unsupported file types
      return (
        <motion.div 
          className="flex flex-col items-center justify-center h-96"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="bg-primary/5 rounded-full p-6 mb-4">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <p className="text-center max-w-md">
            This file type cannot be previewed.
          </p>
          <a 
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-6 text-white bg-primary hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
          >
            Open file in new tab
          </a>
        </motion.div>
      );
    }
  };

  return (
    <div className="document-viewer">
      <motion.div 
        className={cn(
          "bg-muted/30 border rounded-lg p-4 mb-4",
          "hover:border-primary/20 hover:bg-primary/5 transition-colors duration-300"
        )}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h3 className="text-lg font-medium mb-2">{fileName}</h3>
        <p className="text-sm text-muted-foreground mb-4">
          File Type: {fileType || "Unknown"}
        </p>
      </motion.div>
      
      <motion.div 
        className="border rounded-lg overflow-hidden bg-white shadow-sm"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        {renderViewer()}
      </motion.div>
    </div>
  );
};
