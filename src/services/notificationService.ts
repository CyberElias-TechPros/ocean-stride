import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import type { Notification } from '@/lib/schemas';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'system';

// Using STORE_NAMES.NOTIFICATIONS from schemas

export const notificationService = {
  // Get all notifications with pagination
  async getNotifications(companyId: string, options: { 
    page?: number;
    limit?: number;
    includeRead?: boolean;
  } = {}) {
    const { page = 1, limit = 50, includeRead = true } = options;
    
    const all = await db.getAll<Notification>(STORE_NAMES.NOTIFICATIONS);
    const filtered = all.filter((n: any) => {
      const nCompanyId = n.companyId ?? n.metadata?.companyId;
      const readOk = includeRead ? true : !n.read;
      return nCompanyId === companyId && readOk;
    });
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    return {
      items: paginated,
      total: filtered.length,
      page,
      totalPages: Math.ceil(filtered.length / limit),
      hasMore: start + limit < filtered.length,
    };
  },

  // Get unread notification count
  async getUnreadCount(companyId: string): Promise<number> {
    const { items } = await this.getNotifications(companyId, { 
      includeRead: false,
      limit: Number.MAX_SAFE_INTEGER 
    });
    return items.length;
  },

  // Mark a notification as read
  async markAsRead(id: string): Promise<void> {
    await db.update<Notification>(STORE_NAMES.NOTIFICATIONS, id, { read: true } as Partial<Notification>);
  },

  // Mark all notifications as read for a company
  async markAllAsRead(companyId: string): Promise<void> {
    const { items } = await this.getNotifications(companyId, { 
      includeRead: false,
      limit: Number.MAX_SAFE_INTEGER
    });
    
    if (items.length === 0) return;
    
    await Promise.all(items.map(n => db.update<Notification>(STORE_NAMES.NOTIFICATIONS, n.id, { read: true })));
  },

  // Remove a notification
  async removeNotification(id: string): Promise<void> {
    await db.delete(STORE_NAMES.NOTIFICATIONS, id);
  },

  // Clear all notifications for a company
  async clearAll(companyId: string): Promise<void> {
    const { items } = await this.getNotifications(companyId, { 
      limit: Number.MAX_SAFE_INTEGER 
    });
    
    if (items.length === 0) return;
    
    await Promise.all(items.map(n => db.delete(STORE_NAMES.NOTIFICATIONS, n.id)));
  },

  // Subscribe to notification updates
  subscribe(companyId: string, callback: (count: number) => void): () => void {
    // In a real app, this would set up a WebSocket connection
    const interval = setInterval(async () => {
      try {
        const count = await this.getUnreadCount(companyId);
        callback(count);
      } catch (error) {
        console.error('Error in notification subscription:', error);
      }
    }, 30000); // Check every 30 seconds

    // Initial count
    this.getUnreadCount(companyId).then(callback).catch(console.error);

    return () => clearInterval(interval);
  },

  // Generate mock notification for development
  async generateMockNotification(type: NotificationType = 'info', companyId: string = 'default-company'): Promise<Notification> {
    const mockTitles = {
      info: 'New Update Available',
      warning: 'Certificate Expiring Soon',
      error: 'Action Required',
      success: 'Operation Completed',
      system: 'System Notification'
    };

    const mockMessages = {
      info: 'A new version of the application is available. Please update to the latest version.',
      warning: 'Your certificate will expire in 7 days. Please renew it soon.',
      error: 'Action required: Your account needs attention.',
      success: 'Your changes have been saved successfully!',
      system: 'Scheduled maintenance is planned for tomorrow at 2 AM UTC.'
    };

    const notificationData = {
      type,
      title: mockTitles[type] || 'New Notification',
      message: mockMessages[type] || 'You have a new notification',
      read: false,
      metadata: { source: 'system', priority: 'medium' },
      companyId,
    } as Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>;

    const created = await db.createNotification(notificationData as any);
    return created;
  }
};
