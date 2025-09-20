import { db } from '@/lib/database2';
import { STORE_NAMES, INDEX_NAMES } from '@/lib/schemas';
import type { Seafarer, Vessel, Document } from '@/lib/schemas';

export const crewService = {
  async getCrewStats(companyId: string) {
    const seafarers = await db.getByIndex<Seafarer>(STORE_NAMES.SEAFARERS, INDEX_NAMES.SEAFARER_BY_COMPANY, companyId);
    const vessels = await db.getByIndex<Vessel>(STORE_NAMES.VESSELS, INDEX_NAMES.VESSEL_BY_COMPANY, companyId);

    return {
      totalCrew: seafarers.length,
      onboard: seafarers.filter((s) => s.employment?.status === 'onboard').length,
      available: seafarers.filter((s) => s.employment?.status === 'on_leave').length,
      totalVessels: vessels.length,
    };
  },
  
  async getExpiringCertificates(companyId: string, daysThreshold = 30) {
    const now = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(now.getDate() + daysThreshold);

    // Fetch all documents and filter by company if present
    const documents = await db.getAll<Document>(STORE_NAMES.DOCUMENTS);
    return documents.filter((d) => {
      if (d.type !== 'certificate') return false;
      if (!d.expiryDate) return false;
      const exp = new Date(d.expiryDate);
      const inWindow = exp <= thresholdDate && exp >= now;
      const matchesCompany = d.companyId ? d.companyId === companyId : true;
      return inWindow && matchesCompany;
    }).length;
  }
};
