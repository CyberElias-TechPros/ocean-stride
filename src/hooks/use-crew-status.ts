import { useState, useEffect } from 'react';
import { db } from '@/lib/database2';

export interface CrewStatus {
  onboard: number;
  expiringCertificates: number;
  onVacation: number;
  available: number;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCrewStatus(companyId?: string): CrewStatus {
  const [onboard, setOnboard] = useState(0);
  const [expiringCertificates, setExpiringCertificates] = useState(0);
  const [onVacation, setOnVacation] = useState(0);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCrewStatus = async () => {
    if (!companyId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch crew members for the company
      const crewMembers = await db.getByIndex('seafarers', 'companyId', companyId);
      
      // Calculate status counts
      const onboardCount = crewMembers.filter(
        (member: any) => member.employment?.status === 'onboard'
      ).length;
      
      const onVacationCount = crewMembers.filter(
        (member: any) => member.employment?.status === 'on_leave'
      ).length;
      
      const availableCount = crewMembers.filter(
        (member: any) => member.employment?.status === 'available'
      ).length;
      
      // Count expiring certificates (within 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      let expiringCount = 0;
      crewMembers.forEach((member: any) => {
        if (member.documents && Array.isArray(member.documents)) {
          member.documents.forEach((doc: any) => {
            if (doc.expiryDate) {
              const expiryDate = new Date(doc.expiryDate);
              if (expiryDate <= thirtyDaysFromNow) {
                expiringCount++;
              }
            }
          });
        }
      });
      
      setOnboard(onboardCount);
      setOnVacation(onVacationCount);
      setAvailable(availableCount);
      setExpiringCertificates(expiringCount);
    } catch (err) {
      console.error('Error fetching crew status:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch crew status'));
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (companyId) {
      fetchCrewStatus();
    }
  }, [companyId]);

  return {
    onboard,
    expiringCertificates,
    onVacation,
    available,
    loading,
    error,
    refresh: fetchCrewStatus,
  };
}
