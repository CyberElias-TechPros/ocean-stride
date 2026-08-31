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

    let cancelled = false;

    const fetchNotifications = async () => {
      try {
        setLoading(true);
        const data = await notificationService.getNotifications(selectedCompany.id, {
          includeRead: false,
          limit: 100,
        });
        if (cancelled) return;
        setNotifications(data.items);
        setUnreadCount(data.total);
      } catch (err) {
        if (!cancelled) setError(err as Error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchNotifications();

    const unsubscribe = notificationService.subscribe(selectedCompany.id, async (count) => {
      if (cancelled) return;
      setUnreadCount(count);
      const data = await notificationService.getNotifications(selectedCompany.id, {
        includeRead: false,
        limit: 100,
      });
      if (!cancelled) setNotifications(data.items);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedCompany?.id]);

  return { notifications, unreadCount, loading, error };
}
