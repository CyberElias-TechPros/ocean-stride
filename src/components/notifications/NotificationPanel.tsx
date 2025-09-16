import { Bell, Check, Trash2, AlertTriangle, Info, CheckCircle, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Notification, NotificationType } from '@/types/notification';
import { formatDistanceToNow } from 'date-fns';
import useNotificationStore from '@/stores/notificationStore';
import { useCompany } from '@/context/CompanyContext';

const getNotificationIcon = (type: NotificationType) => {
  switch (type) {
    case 'warning':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <AlertTriangle className="w-4 h-4 text-red-500" />;
    case 'success':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'system':
      return <Info className="w-4 h-4 text-blue-500" />;
    default:
      return <Info className="w-4 h-4 text-primary" />;
  }
};

const NotificationItem = ({ notification }: { notification: Notification }) => {
  const { markAsRead, removeNotification } = useNotificationStore();
  
  return (
    <div
      className={cn(
        'p-4 border-b border-border/50 hover:bg-muted/50 transition-colors',
        !notification.read && 'bg-muted/30'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="mt-0.5">
            {getNotificationIcon(notification.type)}
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium">{notification.title}</h4>
            <p className="text-sm text-muted-foreground">{notification.message}</p>
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
            </div>
            {notification.action && (
              <Button
                variant="link"
                size="sm"
                className="h-auto p-0 mt-1 text-xs"
                onClick={notification.action.onClick}
              >
                {notification.action.label} →
              </Button>
            )}
          </div>
        </div>
        <div className="flex space-x-1">
          {!notification.read && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => markAsRead(notification.id)}
            >
              <Check className="w-3.5 h-3.5" />
              <span className="sr-only">Mark as read</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => removeNotification(notification.id)}
          >
            <X className="w-3.5 h-3.5" />
            <span className="sr-only">Dismiss</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export const NotificationPanel = () => {
  const { selectedCompany } = useCompany();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    closePanel,
  } = useNotificationStore();
  
  const handleMarkAllAsRead = () => {
    if (selectedCompany?.id) {
      markAllAsRead(selectedCompany.id);
    }
  };
  
  const handleClearAll = () => {
    if (selectedCompany?.id) {
      clearAll(selectedCompany.id);
    }
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <X className="w-4 h-4 text-red-500" />;
      case 'success':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      default:
        return <Info className="w-4 h-4 text-blue-500" />;
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const readNotifications = notifications.filter(n => n.read);

  return (
    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-lg shadow-lg overflow-hidden z-50">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h3 className="font-medium">Notifications</h3>
        <div className="flex items-center space-x-2">
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              className="text-xs h-6 px-2"
            >
              Mark all as read
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="text-xs h-6 px-2 text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={closePanel}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto">
        {notifications.length > 0 ? (
          <>
            {unreadNotifications.length > 0 && (
              <div>
                <div className="bg-muted/30 px-4 py-2 text-xs font-medium text-muted-foreground">
                  New
                </div>
                {unreadNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
            {readNotifications.length > 0 && (
              <div>
                <div className="bg-muted/10 px-4 py-2 text-xs font-medium text-muted-foreground">
                  Earlier
                </div>
                {readNotifications.map(notification => (
                  <NotificationItem key={notification.id} notification={notification} />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="p-4 text-center text-muted-foreground text-sm">
            No notifications
          </div>
        )}
      </div>
      
      {notifications.length > 0 && (
        <div className="border-t p-2 text-right">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground"
            onClick={handleClearAll}
          >
            Clear all notifications
          </Button>
        </div>
      )}
    </div>
  );
};
