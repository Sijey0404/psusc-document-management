
import { Badge } from "@/components/ui/badge";
import { Clock, Check } from "lucide-react";

interface DeadlineStatusBadgeProps {
  createdAt: string;
  deadline: string | null;
}

export const DeadlineStatusBadge = ({ createdAt, deadline }: DeadlineStatusBadgeProps) => {
  // If there's no deadline, we can't determine if it's late
  if (!deadline) {
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200">
        No Deadline
      </Badge>
    );
  }

  const submissionDate = new Date(createdAt);
  const deadlineDate = new Date(deadline);
  const isOnTime = submissionDate <= deadlineDate;

  if (isOnTime) {
    return (
      <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200 flex items-center gap-1">
        <Check className="h-3 w-3" />
        On Time
      </Badge>
    );
  } else {
    return (
      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 flex items-center gap-1">
        <Clock className="h-3 w-3" />
        Late
      </Badge>
    );
  }
};
