import BaseService from './baseService';
import { Vessel, VesselCreateDto, VesselUpdateDto } from '@/types';

class FleetService extends BaseService<Vessel, VesselCreateDto, VesselUpdateDto> {
  constructor() {
    super('/fleet/vessels');
  }

  /**
   * Get vessels by status
   */
  async getVesselsByStatus(status: 'active' | 'maintenance' | 'inactive'): Promise<Vessel[]> {
    const response = await this.apiClient.get<Vessel[]>(`${this.endpoint}/status/${status}`);
    return response.data;
  }

  /**
   * Get vessels by type
   */
  async getVesselsByType(type: string): Promise<Vessel[]> {
    const response = await this.apiClient.get<Vessel[]>(`${this.endpoint}/type/${type}`);
    return response.data;
  }

  /**
   * Get vessels that need maintenance
   */
  async getVesselsNeedingMaintenance(): Promise<Vessel[]> {
    const response = await this.apiClient.get<Vessel[]>(`${this.endpoint}/needs-maintenance`);
    return response.data;
  }

  /**
   * Update vessel status
   */
  async updateVesselStatus(id: string, status: string, notes?: string): Promise<Vessel> {
    const response = await this.apiClient.patch<Vessel>(`${this.endpoint}/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  }

  /**
   * Upload vessel documents
   */
  async uploadDocument(vesselId: string, file: File, documentType: string): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const response = await this.apiClient.post<{ url: string }>(
      `${this.endpoint}/${vesselId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }
}

export const fleetService = new FleetService();
export default fleetService;
