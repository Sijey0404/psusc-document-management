
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
  const { user, isAdmin, profile } = useAuth();
  const { toast } = useToast();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!user || !isAdmin) return;

    if (!profile?.department_id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Fetch notifications from the notifications table
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('department_id', profile.department_id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (notifError) throw notifError;
      
      // Also fetch recent document uploads as fallback
      const { data: docData, error: docError } = await supabase
        .from('documents')
        .select(`
          id,
          title,
          created_at,
          submitted_by,
          profiles!documents_submitted_by_fkey (name)
        `)
        .eq('department_id', profile.department_id)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (docError) throw docError;
      
      // Combine both notification sources
      const notificationsList: Notification[] = [
        ...(notifData || []).map((notif: any) => ({
          id: notif.id,
          user_id: notif.user_id,
          message: notif.message,
          created_at: notif.created_at,
          read: notif.read,
          type: notif.type || 'GENERAL',
          reference_id: notif.reference_id || notif.related_document_id || ''
        })),
        ...(docData || []).map((doc) => ({
          id: doc.id,
          user_id: doc.submitted_by,
          message: `${doc.profiles?.name || 'Unknown user'} uploaded "${doc.title}"`,
          created_at: doc.created_at,
          read: false,
          type: 'DOCUMENT_UPLOAD',
          reference_id: doc.id
        }))
      ];
      
      // Sort by created_at and take the most recent 10
      const sortedNotifications = notificationsList
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
      
      setNotifications(sortedNotifications);
      setUnreadCount(sortedNotifications.filter(n => !n.read).length);
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
  }, [user, profile?.department_id]);
  
  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      // Update all unread notifications for this user to read
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false)
        .eq('department_id', profile?.department_id || null);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
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
