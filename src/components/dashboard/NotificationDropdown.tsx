
import { useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { RecentNotificationsList } from "@/components/dashboard/RecentNotificationsList";
import { Notification } from "@/types";

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user || !isAdmin) return;
    
    try {
      setIsLoading(true);
      
      const { data, error } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          created_at,
          submitted_by,
          profiles!documents_submitted_by_fkey (name)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      
      if (data) {
        // Transform the data to match the Notification type
        const notificationData: Notification[] = data.map((doc) => ({
          id: doc.id,
          user_id: doc.submitted_by,
          message: `${doc.profiles?.name || 'Unknown user'} uploaded a "${doc.title}" document (ID: ${doc.id})`,
          created_at: doc.created_at,
          read: false,
          type: 'DOCUMENT_UPLOAD',
          reference_id: doc.id
        }));
        
        setNotifications(notificationData);
        setUnreadCount(notificationData.length);
      }
    } catch (error: any) {
      console.error("Error fetching notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to document changes
    const channel = supabase
      .channel('public:documents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        (payload) => {
          // When a new document is inserted, refresh the notifications
          fetchNotifications();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);
  
  const markAllAsRead = () => {
    setUnreadCount(0);
    // In a real implementation, you might want to update a notifications table in the database
  };

  // Only render for admin users
  if (!isAdmin) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72 max-h-80 overflow-y-auto bg-background border shadow-lg rounded-md p-0"
        >
          <div className="flex justify-between items-center p-2 border-b">
            <h3 className="font-medium text-sm">Notifications</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs h-7 px-2 hover:bg-muted"
            >
              Mark all as read
            </Button>
          </div>
          <RecentNotificationsList notifications={notifications} loading={isLoading} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
