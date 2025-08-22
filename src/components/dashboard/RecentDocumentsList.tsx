
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Document } from "@/types";
import { StatusBadge } from "../document/StatusBadge";
import { LoadingSpinner } from "../ui/loading-spinner";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface RecentDocumentsListProps {
  documents: Document[];
  loading: boolean;
}

export const RecentDocumentsList = ({ documents, loading }: RecentDocumentsListProps) => {
  const navigate = useNavigate();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow duration-300">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="text-lg flex items-center">
          <FileText className="h-5 w-5 mr-2 text-primary" />
          Recent Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner text="Loading documents..." />
          </div>
        ) : documents.length > 0 ? (
          <motion.div 
            className="divide-y" 
            variants={container}
            initial="hidden"
            animate="show"
          >
            {documents.map((doc) => (
              <motion.div
                key={doc.id}
                variants={item}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-between py-4 px-6 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
                onClick={() => navigate(`/documents/${doc.id}`)}
                whileHover={{ 
                  backgroundColor: "rgba(0,0,0,0.05)",
                  x: 3
                }}
              >
                <div className="flex items-center">
                  <div className="mr-4">
                    <FileText className="h-8 w-8 text-primary-foreground bg-primary/10 p-1 rounded" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                      <StatusBadge status={doc.status} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3 opacity-50" />
            <p className="text-muted-foreground">No recent documents</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
