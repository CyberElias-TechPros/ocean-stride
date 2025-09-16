import { create } from 'zustand';
import { notificationService, Notification } from '@/services/notificationService';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  error: Error | null;
  fetchNotifications: (companyId: string) => Promise<void>;
  markAsRead: (id: string) => void;
  markAllAsRead: (companyId: string) => Promise<void>;
  removeNotification: (id: string) => void;
  clearAll: (companyId: string) => Promise<void>;
  togglePanel: () => void;
  closePanel: () => void;
}

const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isOpen: false,
  isLoading: false,
  error: null,

  fetchNotifications: async (companyId: string) => {
    if (!companyId) return;

    set({ isLoading: true, error: null });
    try {
      const data = await notificationService.getNotifications(companyId);
      set({
        notifications: data.items,
        unreadCount: data.items.filter(n => !n.read).length,
      });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      set({ error: error as Error });
    } finally {
      set({ isLoading: false });
    }
  },

  markAsRead: (id: string) => {
    set(state => {
      const updated = state.notifications.map(n =>
        n.id === id ? { ...n, read: true } : n
      );
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
    notificationService.markAsRead(id);
  },

  markAllAsRead: async (companyId: string) => {
    set(state => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
      unreadCount: 0,
    }));
    await notificationService.markAllAsRead(companyId);
  },

  removeNotification: (id: string) => {
    set(state => {
      const updated = state.notifications.filter(n => n.id !== id);
      return {
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
    notificationService.removeNotification(id);
  },

  clearAll: async (companyId: string) => {
    set({ notifications: [], unreadCount: 0 });
    await notificationService.clearAll(companyId);
  },

  togglePanel: () => set(state => ({ isOpen: !state.isOpen })),
  closePanel: () => set({ isOpen: false }),
}));

export default useNotificationStore;
