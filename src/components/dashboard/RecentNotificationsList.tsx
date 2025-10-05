
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, FileText, Folder } from "lucide-react";
import { Notification } from "@/types";
import { useNavigate } from "react-router-dom";

interface RecentNotificationsListProps {
  notifications: Notification[];
  loading: boolean;
  inCard?: boolean;
}

export const RecentNotificationsList = ({ notifications, loading, inCard = true }: RecentNotificationsListProps) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    // Handle different notification types
    if (notification.type === 'ACCOUNT_CONFIRMATION') {
      navigate(`/account-confirmation`);
    } else if (notification.type === 'ACCOUNT_RECOVERY') {
      navigate(`/account-recovery`);
    } else if (notification.type?.includes('FOLDER') || notification.message?.includes('folder')) {
      navigate(`/faculty-folders?folder=${notification.reference_id}`);
    } else if (notification.reference_id) {
      navigate(`/documents/${notification.reference_id}`);
    }
  };

  const NotificationContent = () => (
    <>
      {loading ? (
        <div className="flex justify-center py-8">
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length > 0 ? (
        <div className="divide-y">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className="flex items-center justify-between py-4 px-6 cursor-pointer hover:bg-muted/50 transition-colors duration-200"
              onClick={() => handleNotificationClick(notification)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleNotificationClick(notification);
                }
              }}
            >
              <div className="flex items-center">
                <div className="mr-4">
                  {notification.type === 'DOCUMENT_UPLOAD' ? (
                    <FileText className="h-8 w-8 text-blue-500" />
                  ) : notification.type === 'ACCOUNT_CONFIRMATION' ? (
                    <Bell className="h-8 w-8 text-green-500" />
                  ) : notification.type === 'ACCOUNT_RECOVERY' ? (
                    <Bell className="h-8 w-8 text-orange-500" />
                  ) : notification.type?.includes('FOLDER') || notification.message?.includes('folder') ? (
                    <Folder className="h-8 w-8 text-green-500" />
                  ) : (
                    <Bell className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{notification.message}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
              {!notification.read && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No recent notifications</p>
        </div>
      )}
    </>
  );

  if (inCard) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <NotificationContent />
        </CardContent>
      </Card>
    );
  }
  
  return <NotificationContent />;
};
