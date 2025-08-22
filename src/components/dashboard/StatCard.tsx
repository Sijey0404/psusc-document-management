
import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  iconColor: string;
  bgColor?: string;
}

export const StatCard = ({ title, value, icon: Icon, iconColor, bgColor = "bg-muted/50" }: StatCardProps) => {
  return (
    <Card className="overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 group">
      <CardContent className="p-0">
        <div className="flex items-stretch h-full">
          <div className={`${bgColor} p-4 flex items-center justify-center group-hover:scale-105 transition-transform duration-300`}>
            <Icon className={`w-8 h-8 ${iconColor}`} />
          </div>
          <div className="p-6 flex flex-col justify-center flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
            <motion.p 
              className="text-3xl font-bold"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 200, 
                delay: 0.1 
              }}
            >
              {value}
            </motion.p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
