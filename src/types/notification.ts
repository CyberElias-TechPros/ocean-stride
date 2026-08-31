export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'system' | 'reminder';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  metadata?: Record<string, unknown>;
}

export interface NotificationGroup {
  date: string;
  notifications: Notification[];
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  togglePanel: () => void;
  closePanel: () => void;
  fetchNotifications: () => Promise<void>;
}
