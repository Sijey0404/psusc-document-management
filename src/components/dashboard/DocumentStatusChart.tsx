
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { 
  Line, 
  LineChart, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

type DocumentStats = {
  month: string;
  pending: number;
  approved: number;
  rejected: number;
  total: number;
};

type ChartData = {
  name: string;
  pending: number;
  approved: number;
  rejected: number;
};

export const DocumentStatusChart = () => {
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDocumentStats = async () => {
      try {
        setLoading(true);
        
        // Fetch all documents
        const { data, error } = await supabase
          .from('documents')
          .select('status, created_at');
        
        if (error) throw error;
        
        if (data) {
          // Group documents by month and status
          const statsByMonth: Record<string, DocumentStats> = {};
          
          data.forEach((doc: any) => {
            const date = new Date(doc.created_at);
            const monthYear = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
            
            if (!statsByMonth[monthYear]) {
              statsByMonth[monthYear] = {
                month: monthYear,
                pending: 0,
                approved: 0,
                rejected: 0,
                total: 0
              };
            }
            
            statsByMonth[monthYear].total += 1;
            
            if (doc.status === 'PENDING') {
              statsByMonth[monthYear].pending += 1;
            } else if (doc.status === 'APPROVED') {
              statsByMonth[monthYear].approved += 1;
            } else if (doc.status === 'REJECTED') {
              statsByMonth[monthYear].rejected += 1;
            }
          });
          
          // Convert to percentage and prepare chart data
          const chartData = Object.values(statsByMonth).map((stats) => {
            return {
              name: stats.month,
              pending: Math.round((stats.pending / stats.total) * 100) || 0,
              approved: Math.round((stats.approved / stats.total) * 100) || 0,
              rejected: Math.round((stats.rejected / stats.total) * 100) || 0
            };
          });
          
          // Sort by date
          chartData.sort((a, b) => {
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const [aMonth, aYear] = a.name.split(' ');
            const [bMonth, bYear] = b.name.split(' ');
            
            if (aYear !== bYear) return Number(aYear) - Number(bYear);
            return months.indexOf(aMonth) - months.indexOf(bMonth);
          });
          
          setChartData(chartData);
        }
      } catch (error: any) {
        console.error("Error fetching document stats:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to fetch document statistics",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDocumentStats();
  }, []);
  
  const chartConfig = {
    pending: {
      label: "Pending",
      theme: {
        light: "#f59e0b",
        dark: "#f59e0b"
      }
    },
    approved: {
      label: "Approved",
      theme: {
        light: "#10b981",
        dark: "#10b981"
      }
    },
    rejected: {
      label: "Rejected",
      theme: {
        light: "#ef4444",
        dark: "#ef4444"
      }
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Document Status Trends</CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <p>Loading chart data...</p>
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex justify-center py-8">
            <p>No document data available for chart</p>
          </div>
        ) : (
          <div className="h-80 w-full">
            <ChartContainer config={chartConfig}>
              <LineChart data={chartData}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis
                  stroke="#888888"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <CartesianGrid stroke="#e5e7eb" strokeDasharray="5 5" />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="approved"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="rejected"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                />
                <Legend />
              </LineChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
