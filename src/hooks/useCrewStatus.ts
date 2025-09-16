import { useState, useEffect } from 'react';
import { crewService } from '@/services/crewService';
import { useCompany } from '@/context/CompanyContext';

export function useCrewStatus() {
  const { selectedCompany } = useCompany();
  const [stats, setStats] = useState({
    totalCrew: 0,
    onboard: 0,
    available: 0,
    totalVessels: 0,
    expiringCertificates: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = async () => {
    if (!selectedCompany) return;
    
    try {
      setLoading(true);
      const [crewStats, certsCount] = await Promise.all([
        crewService.getCrewStats(selectedCompany.id),
        crewService.getExpiringCertificates(selectedCompany.id)
      ]);
      
      setStats({
        ...crewStats,
        expiringCertificates: certsCount
      });
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    
    // Refresh data every 5 minutes
    const interval = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [selectedCompany?.id]);

  return { ...stats, loading, error, refresh };
}
