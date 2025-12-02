import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, Clock } from "lucide-react";

interface Submission {
  id: string;
  document_id: string;
  faculty_name: string;
  submitted_at: string;
  is_on_time: boolean;
}

interface SubmissionListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  submissions: Submission[];
  loading?: boolean;
}

export const SubmissionListModal = ({
  isOpen,
  onClose,
  title,
  submissions,
  loading = false,
}: SubmissionListModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[65vh]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Faculty</TableHead>
                <TableHead>Submitted At</TableHead>
                <TableHead>Timeliness</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : submissions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-8">
                    No submissions found
                  </TableCell>
                </TableRow>
              ) : (
                submissions.map((submission) => (
                  <TableRow key={submission.id}>
                    <TableCell className="font-medium">{submission.faculty_name}</TableCell>
                    <TableCell>
                      {new Date(submission.submitted_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {submission.is_on_time ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          On Time
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-600 border-red-600">
                          <Clock className="w-3 h-3 mr-1" />
                          Late
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
