import { useState, useEffect } from 'react';
import { notificationService } from '@/services/notificationService';
import { useCompany } from '@/context/CompanyContext';

export function useNotifications() {
  const { selectedCompany } = useCompany();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!selectedCompany) return;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getUnreadNotifications(selectedCompany.id);
        setNotifications(data.items);
        setUnreadCount(data.total);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
    
    const unsubscribe = notificationService.subscribeToUpdates((newNotification: any) => {
      setNotifications(prev => [newNotification, ...prev]);
      setUnreadCount(prev => prev + 1);
    });

    return () => unsubscribe();
  }, [selectedCompany?.id]);

  return { notifications, unreadCount, loading, error };
}
