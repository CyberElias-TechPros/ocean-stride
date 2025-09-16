import { db } from '@/lib/database';

export type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'system';

export interface NotificationMetadata {
  companyId: string;
  source: string;
  priority: 'low' | 'medium' | 'high';
  [key: string]: unknown;
}

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
  metadata: NotificationMetadata;
}

// Extend the global Window interface to include our database
declare global {
  interface Window {
    db: any; // This should be properly typed with your database interface
  }
}

const NOTIFICATION_STORE = 'notifications';

export const notificationService = {
  // Get all notifications with pagination
  async getNotifications(companyId: string, options: { 
    page?: number;
    limit?: number;
    includeRead?: boolean;
  } = {}) {
    const { page = 1, limit = 50, includeRead = true } = options;
    
    return db.withTransaction(NOTIFICATION_STORE, 'readonly', async (store) => {
      return new Promise<{ 
        items: Notification[]; 
        total: number; 
        page: number; 
        totalPages: number; 
        hasMore: boolean;
      }>((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => {
          let notifications = request.result as Notification[];
          
          // Filter by company and read status
          notifications = notifications.filter(n => 
            n.metadata?.companyId === companyId && 
            (includeRead ? true : !n.read)
          );

          // Sort by createdAt (newest first)
          notifications.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );

          // Apply pagination
          const start = (page - 1) * limit;
          const paginated = notifications.slice(start, start + limit);

          resolve({
            items: paginated,
            total: notifications.length,
            page,
            totalPages: Math.ceil(notifications.length / limit),
            hasMore: start + limit < notifications.length
          });
        };
        
        request.onerror = () => reject(request.error);
      });
    });
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
    await db.withTransaction(NOTIFICATION_STORE, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.get(id);
        
        request.onsuccess = () => {
          const notification = request.result as Notification;
          if (notification) {
            const updateRequest = store.put({ 
              ...notification, 
              read: true,
              updatedAt: new Date().toISOString()
            });
            
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
          } else {
            resolve();
          }
        };
        
        request.onerror = () => reject(request.error);
      });
    });
  },

  // Mark all notifications as read for a company
  async markAllAsRead(companyId: string): Promise<void> {
    const { items } = await this.getNotifications(companyId, { 
      includeRead: false,
      limit: Number.MAX_SAFE_INTEGER
    });
    
    if (items.length === 0) return;
    
    await db.withTransaction(NOTIFICATION_STORE, 'readwrite', (store) => {
      const now = new Date().toISOString();
      const requests = items.map(notification => {
        return new Promise<void>((resolve, reject) => {
          const updated = { 
            ...notification, 
            read: true,
            updatedAt: now
          };
          
          const request = store.put(updated);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      return Promise.all(requests).then(() => {});
    });
  },

  // Remove a notification
  async removeNotification(id: string): Promise<void> {
    await db.withTransaction(NOTIFICATION_STORE, 'readwrite', (store) => {
      return new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  },

  // Clear all notifications for a company
  async clearAll(companyId: string): Promise<void> {
    const { items } = await this.getNotifications(companyId, { 
      limit: Number.MAX_SAFE_INTEGER 
    });
    
    if (items.length === 0) return;
    
    await db.withTransaction(NOTIFICATION_STORE, 'readwrite', (store) => {
      const requests = items.map(notification => {
        return new Promise<void>((resolve, reject) => {
          const request = store.delete(notification.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      });
      
      return Promise.all(requests).then(() => {});
    });
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

    const notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt' | 'timestamp'> = {
      type,
      title: mockTitles[type] || 'New Notification',
      message: mockMessages[type] || 'You have a new notification',
      read: false,
      metadata: {
        companyId,
        source: 'system',
        priority: 'medium',
        ...(type === 'warning' && { expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      }
    };

    return db.createNotification(notification);
    // Add to database
    await db.put(NOTIFICATION_STORE, notification);
    
    return notification;
  }
};
