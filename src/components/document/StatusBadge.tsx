
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const getStatusContent = () => {
    switch (status) {
      case "PENDING":
        return {
          icon: Clock,
          text: "Pending",
          className: "bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100"
        };
      case "APPROVED":
        return {
          icon: CheckCircle,
          text: "Approved",
          className: "bg-green-50 text-green-600 border-green-200 hover:bg-green-100"
        };
      case "REJECTED":
        return {
          icon: XCircle,
          text: "Rejected",
          className: "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
        };
      default:
        return {
          icon: Clock,
          text: status,
          className: "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
        };
    }
  };

  const { icon: Icon, text, className } = getStatusContent();

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <Badge 
        variant="outline"

        className={`transition-colors duration-200 flex items-center gap-1 px-2 py-0.5 ${className}`}
      >
        <Icon className="h-3 w-3" />
        <span>{text}</span>
      </Badge>
    </motion.div>
  );
};
