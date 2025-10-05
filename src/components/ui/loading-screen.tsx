import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  message?: string;
  className?: string;
}

export function LoadingScreen({ message = "Loading...", className }: LoadingScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background",
        className
      )}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col items-center"
      >
        <div className="relative flex items-center justify-center mb-4 w-20 h-20">
          <div className="absolute border-t-2 border-primary h-20 w-20 rounded-full animate-spin z-10"></div>
          <div className="absolute border-primary border-2 h-20 w-20 rounded-full opacity-25 z-10"></div>
          <img 
            src="/lovable-uploads/7e798f9c-5e5c-4155-8e58-d487fb7288a9.png" 
            alt="PSU Logo" 
            className="h-12 w-auto" 
          />
        </div>
        
        <p className="text-lg font-medium text-center">{message}</p>
        <p className="text-sm text-muted-foreground mt-2">Please wait while we prepare your dashboard</p>
      </motion.div>
    </motion.div>
  );
}
