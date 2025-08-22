
import { CheckCircle, Clock, XCircle } from "lucide-react";
import { StatCard } from "./StatCard";
import { motion } from "framer-motion";

interface StatsGridProps {
  stats: {
    pending: number;
    approved: number;
    rejected: number;
    totalDocuments?: number;
  };
}

export const StatsGrid = ({ stats }: StatsGridProps) => {
  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <StatCard 
          title="Pending" 
          value={stats.pending} 
          icon={Clock} 
          iconColor="text-amber-500" 
          bgColor="bg-amber-50"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <StatCard 
          title="Approved" 
          value={stats.approved} 
          icon={CheckCircle} 
          iconColor="text-green-500" 
          bgColor="bg-green-50"
        />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
      >
        <StatCard 
          title="Rejected" 
          value={stats.rejected} 
          icon={XCircle} 
          iconColor="text-red-500"
          bgColor="bg-red-50" 
        />
      </motion.div>
    </motion.div>
  );
};
