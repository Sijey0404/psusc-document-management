
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
import { notificationService } from "@/services/notificationService";

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (forceRefresh = false) => {
    if (!user || !isAdmin) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching notifications for admin user:", user.id, "forceRefresh:", forceRefresh);
      
      const notificationsList = await notificationService.fetchNotifications(user.id, forceRefresh);
      
      setNotifications(notificationsList);
      const unreadCount = notificationService.getUnreadCount(notificationsList);
      setUnreadCount(unreadCount);
      console.log("Admin unread notifications count:", unreadCount);
      console.log("Admin notifications read status:", notificationsList.map(n => ({ id: n.id, read: n.read })));
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
    
    // Subscribe to both document changes and notification changes
    const documentsChannel = supabase
      .channel('public:documents')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        () => fetchNotifications()
      )
      .subscribe();
    
    const notificationsChannel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(documentsChannel);
      supabase.removeChannel(notificationsChannel);
    };
  }, [user]);
  
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      console.log("Marking all notifications as read for admin user:", user.id);
      
      await notificationService.markAllAsRead(user.id);
      
      // Update local state immediately
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      // Force a refresh to ensure consistency
      setTimeout(() => {
        fetchNotifications(true);
      }, 1000);
      
      toast({
        title: "Success",
        description: "All notifications marked as read",
      });
    } catch (error: any) {
      console.error("Error marking notifications as read:", error);
      toast({
        title: "Error",
        description: "Failed to mark notifications as read",
        variant: "destructive",
      });
    }
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
