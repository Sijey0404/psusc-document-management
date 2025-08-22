
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Document, Notification } from "@/types";
import { useToast } from "@/hooks/use-toast";

export const useFacultyDashboardData = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<Document[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isLoading, setIsLoading] = useState({
    documents: true,
    notifications: true,
  });
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch faculty documents
  const fetchDocuments = async () => {
    if (!user) return;
    
    try {
      setIsLoading((prev) => ({ ...prev, documents: true }));
      
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          profiles!submitted_by (name),
          reviewer:profiles!reviewed_by (name),
          department:department_id (name),
          document_categories:category_id (name)
        `)
        .eq("submitted_by", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        // Transform the data to ensure it matches the Document type
        const formattedDocuments: Document[] = data.map(doc => ({
          ...doc,
          // Ensure status is cast to the expected union type
          status: doc.status as "PENDING" | "APPROVED" | "REJECTED",
          profiles: doc.profiles ? { name: doc.profiles.name } : null,
          reviewer: doc.reviewer ? { name: doc.reviewer.name } : null,
          department: doc.department ? { name: doc.department.name } : null,
          document_categories: doc.document_categories ? { name: doc.document_categories.name } : null
        }));
        
        setDocuments(formattedDocuments);
        setRecentDocuments(formattedDocuments.slice(0, 5));
      }
    } catch (error: any) {
      console.error("Error fetching documents:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load documents",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, documents: false }));
    }
  };

  // Fetch faculty notifications
  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading((prev) => ({ ...prev, notifications: true }));
      
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (data) {
        // Transform the data to match the Notification type
        // Add the required "type" property to each notification
        const notificationsWithType: Notification[] = data.map((notification) => ({
          ...notification,
          type: notification.message.includes("approved") 
            ? "APPROVAL" 
            : notification.message.includes("rejected") 
            ? "REJECTION" 
            : "GENERAL",
          reference_id: notification.related_document_id || notification.id // Use related_document_id as reference_id if available, otherwise use the notification id
        }));
        
        setNotifications(notificationsWithType);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading((prev) => ({ ...prev, notifications: false }));
    }
  };

  useEffect(() => {
    if (user) {
      fetchDocuments();
      fetchNotifications();
    }
  }, [user]);

  // Filter documents by uploader name
  const getFilteredDocuments = () => {
    if (!searchQuery) return documents;
    
    return documents.filter((doc) => 
      doc.profiles?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  // Compute stats for the dashboard
  const getStats = () => {
    return {
      pending: documents.filter(doc => doc.status === "PENDING").length,
      approved: documents.filter(doc => doc.status === "APPROVED").length,
      rejected: documents.filter(doc => doc.status === "REJECTED").length,
      totalDocuments: documents.length
    };
  };

  return {
    documents: getFilteredDocuments(),
    recentDocuments,
    notifications,
    isLoading,
    stats: getStats(),
    searchQuery,
    setSearchQuery,
    refetch: {
      documents: fetchDocuments,
      notifications: fetchNotifications,
    },
  };
};
