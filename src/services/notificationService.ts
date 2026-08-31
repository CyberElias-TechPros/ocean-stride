import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import type { Notification as DbNotification } from '@/lib/schemas';
import type { Notification as UiNotification } from '@/types/notification';

export type { NotificationType } from '@/types/notification';
export type { Notification } from '@/types/notification';

/** Convert a stored notification record into the UI model with a sortable timestamp. */
function toUiNotification(n: DbNotification): UiNotification {
  const timestamp = n.createdAt || n.updatedAt || new Date().toISOString();
  const actionUrl = n.actionUrl;
  const actionLabel = n.actionLabel;
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    timestamp,
    read: n.read,
    action: actionUrl && actionLabel
      ? {
          label: actionLabel,
          onClick: () => {
            window.open(actionUrl, '_blank', 'noopener,noreferrer');
          },
        }
      : undefined,
    metadata: n.metadata,
  };
}

// Using STORE_NAMES.NOTIFICATIONS from schemas

export const notificationService = {
  // Get all notifications with pagination
  async getNotifications(companyId: string, options: { 
    page?: number;
    limit?: number;
    includeRead?: boolean;
  } = {}) {
    const { page = 1, limit = 50, includeRead = true } = options;
    
    const all = await db.getAll<DbNotification>(STORE_NAMES.NOTIFICATIONS);
    const filtered = all.filter((n) => {
      const nCompanyId = n.companyId ?? n.metadata?.companyId;
      const readOk = includeRead ? true : !n.read;
      return nCompanyId === companyId && readOk;
    });
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);
    return {
      items: paginated.map(toUiNotification),
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
    await db.update<DbNotification>(STORE_NAMES.NOTIFICATIONS, id, { read: true } as Partial<DbNotification>);
  },

  // Mark all notifications as read for a company
  async markAllAsRead(companyId: string): Promise<void> {
    const { items } = await this.getNotifications(companyId, { 
      includeRead: false,
      limit: Number.MAX_SAFE_INTEGER
    });
    
    if (items.length === 0) return;
    
    await Promise.all(items.map(n => db.update<DbNotification>(STORE_NAMES.NOTIFICATIONS, n.id, { read: true })));
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
  }
};
