
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

export const FacultyNotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching notifications for user:", user.id);
      
      // Fetch user notifications
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (notificationsError) {
        console.error("Error fetching notifications:", notificationsError);
        throw notificationsError;
      }
      
      console.log("Fetched notifications:", notificationsData?.length);
      
      if (notificationsData && notificationsData.length > 0) {
        // Transform the data to ensure all required properties are present
        const formattedNotifications: Notification[] = notificationsData.map(notification => ({
          id: notification.id,
          user_id: notification.user_id,
          message: notification.message,
          created_at: notification.created_at,
          read: notification.read,
          related_document_id: notification.related_document_id,
          // Add required fields that don't exist in the database schema
          type: determineNotificationType(notification.message),
          reference_id: notification.related_document_id || notification.id.toString()
        }));
        
        setNotifications(formattedNotifications);
        
        // Count unread notifications
        const unread = formattedNotifications.filter(notification => !notification.read).length;
        setUnreadCount(unread);
        console.log("Unread notifications:", unread);
      } else {
        // Fallback to the old document status-based notifications
        const { data: userDocuments, error: docsError } = await supabase
          .from('documents')
          .select('id, title, status, feedback, updated_at')
          .eq('submitted_by', user.id)
          .order('updated_at', { ascending: false })
          .limit(10);
        
        if (docsError) throw docsError;
        
        if (userDocuments && userDocuments.length > 0) {
          // Transform document data to notifications
          const notificationData: Notification[] = userDocuments.map((doc) => {
            let message = "";
            let type = "DOCUMENT_UPDATE";
            
            if (doc.status === "APPROVED") {
              message = `Your document "${doc.title}" has been approved.`;
              type = "DOCUMENT_APPROVED";
            } else if (doc.status === "REJECTED") {
              message = `Your document "${doc.title}" has been rejected.${doc.feedback ? ` Reason: ${doc.feedback}` : ''}`;
              type = "DOCUMENT_REJECTED";
            } else {
              message = `Your document "${doc.title}" status is now ${doc.status}.`;
            }
            
            return {
              id: `${doc.id}-${doc.updated_at}`,
              user_id: user.id,
              message,
              created_at: doc.updated_at,
              read: false, // Assume all notifications are unread initially
              type,
              reference_id: doc.id,
              related_document_id: doc.id
            };
          });
          
          setNotifications(notificationData);
          setUnreadCount(notificationData.length);
          console.log("Generated notification data from documents:", notificationData.length);
        } else {
          setNotifications([]);
          setUnreadCount(0);
          console.log("No notifications or documents found");
        }
      }
    } catch (error: any) {
      console.error("Error fetching faculty notifications:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch notifications",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to determine notification type from message
  const determineNotificationType = (message: string): string => {
    if (message.includes('approved')) return 'DOCUMENT_APPROVED';
    if (message.includes('rejected')) return 'DOCUMENT_REJECTED';
    if (message.includes('folder')) return 'FOLDER_CREATED';
    return 'GENERAL_NOTIFICATION';
  };
  
  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to document changes related to this faculty user
    const documentChannel = supabase
      .channel('public:documents')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'documents',
          filter: `submitted_by=eq.${user?.id}` 
        },
        (payload) => {
          console.log("Document change detected:", payload);
          // When a document is updated, refresh the notifications
          fetchNotifications();
        }
      )
      .subscribe();
      
    // Subscribe to notification changes for this user
    const notificationChannel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`
        },
        (payload) => {
          console.log("New notification received:", payload);
          // When a new notification is created, refresh the notifications
          fetchNotifications();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(documentChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user]);
  
  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      // Check if we're using the notifications table
      const hasNotificationTable = notifications[0].hasOwnProperty('read');
      
      if (hasNotificationTable) {
        console.log("Marking all notifications as read");
        // Update all unread notifications for this user
        const { error } = await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', user.id)
          .eq('read', false);
          
        if (error) throw error;
      }
      
      // Update UI state
      setUnreadCount(0);
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error: any) {
      console.error("Error marking notifications as read:", error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-80 max-h-96 overflow-y-auto bg-background border shadow-lg rounded-md p-0"
        >
          <div className="flex justify-between items-center p-3 border-b">
            <h3 className="font-semibold">Notifications</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={markAllAsRead}
              className="text-xs hover:bg-muted"
            >
              Mark all as read
            </Button>
          </div>
          <RecentNotificationsList notifications={notifications} loading={isLoading} inCard={false} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
