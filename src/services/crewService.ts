import { db } from '@/lib/database';

export const crewService = {
  async getCrewStats(companyId: string) {
    const seafarers = await db.getAll('seafarers');
    const vessels = await db.getAll('vessels');
    
    return {
      totalCrew: seafarers.length,
      onboard: seafarers.filter((s: any) => 
        s.employment?.status === 'active' && s.employment?.currentVessel
      ).length,
      available: seafarers.filter((s: any) => 
        s.employment?.status === 'available'
      ).length,
      totalVessels: vessels.length
    };
  },
  
  async getExpiringCertificates(companyId: string, daysThreshold = 30) {
    const seafarers = await db.getAll('seafarers');
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);
    
    let expiringCount = 0;
    
    seafarers.forEach((seafarer: any) => {
      seafarer.qualifications?.certificates?.forEach((cert: any) => {
        const expiryDate = new Date(cert.expiryDate);
        if (expiryDate <= thresholdDate && expiryDate >= now) {
          expiringCount++;
        }
      });
    });
    
    return expiringCount;
  }
};
