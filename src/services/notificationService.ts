import { supabase } from "@/integrations/supabase/client";

export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read: boolean;
  type: string;
  reference_id: string;
  related_document_id?: string | null;
}

export class NotificationService {
  private static instance: NotificationService;
  private cache: Map<string, Notification[]> = new Map();
  private lastFetchTime: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async fetchNotifications(userId: string, forceRefresh = false): Promise<Notification[]> {
    const now = Date.now();
    const lastFetch = this.lastFetchTime.get(userId) || 0;
    
    // Use cache if not forcing refresh and cache is still valid
    if (!forceRefresh && this.cache.has(userId) && (now - lastFetch) < this.CACHE_DURATION) {
      console.log("Using cached notifications for user:", userId);
      return this.cache.get(userId) || [];
    }

    try {
      console.log("Fetching fresh notifications for user:", userId);
      
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error("Error fetching notifications:", error);
        throw error;
      }

      const formattedNotifications: Notification[] = (notificationsData || []).map(notification => ({
        id: notification.id,
        user_id: notification.user_id,
        message: notification.message,
        created_at: notification.created_at,
        read: notification.read,
        related_document_id: notification.related_document_id,
        type: this.determineNotificationType(notification.message),
        reference_id: notification.related_document_id || notification.id.toString()
      }));

      // Update cache
      this.cache.set(userId, formattedNotifications);
      this.lastFetchTime.set(userId, now);

      console.log("Fetched and cached notifications:", formattedNotifications.length);
      return formattedNotifications;
    } catch (error) {
      console.error("Error in NotificationService:", error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      console.log("Marking all notifications as read for user:", userId);
      
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false)
        .select();

      if (error) {
        console.error("Database error:", error);
        throw error;
      }

      console.log("Updated notifications in database:", data?.length);

      // Update cache
      const cachedNotifications = this.cache.get(userId);
      if (cachedNotifications) {
        const updatedNotifications = cachedNotifications.map(notification => ({
          ...notification,
          read: true
        }));
        this.cache.set(userId, updatedNotifications);
      }

      // Force refresh after a delay to ensure consistency
      setTimeout(() => {
        this.fetchNotifications(userId, true);
      }, 1000);

    } catch (error) {
      console.error("Error marking notifications as read:", error);
      throw error;
    }
  }

  getUnreadCount(notifications: Notification[]): number {
    return notifications.filter(notification => !notification.read).length;
  }

  private determineNotificationType(message: string): string {
    if (message.includes('approved')) return 'DOCUMENT_APPROVED';
    if (message.includes('rejected')) return 'DOCUMENT_REJECTED';
    if (message.includes('folder')) return 'FOLDER_CREATED';
    if (message.includes('uploaded')) return 'DOCUMENT_UPLOAD';
    if (message.includes('account')) return 'ACCOUNT_NOTIFICATION';
    return 'GENERAL_NOTIFICATION';
  }

  // Clear cache for a user (useful when logging out)
  clearCache(userId: string): void {
    this.cache.delete(userId);
    this.lastFetchTime.delete(userId);
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
    this.lastFetchTime.clear();
  }
}

export const notificationService = NotificationService.getInstance();
