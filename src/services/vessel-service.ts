import { BaseApi } from '@/lib/api/base-api';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import { 
  Vessel, 
  CreateVesselDto, 
  UpdateVesselDto,
  VesselStatus,
  PaginatedResponse
} from '@/types';

export class VesselService extends BaseApi {
  constructor() {
    super(getApiUrl(''));
  }

  async getVessels(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: VesselStatus
  ): Promise<PaginatedResponse<Vessel>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status }),
    });

    return this.get<PaginatedResponse<Vessel>>(
      `${API_ENDPOINTS.VESSELS.BASE}?${params.toString()}`
    );
  }

  async getVesselById(id: string): Promise<Vessel> {
    return this.get<Vessel>(API_ENDPOINTS.VESSELS.BY_ID(id));
  }

  async createVessel(data: CreateVesselDto): Promise<Vessel> {
    return this.post<Vessel>(API_ENDPOINTS.VESSELS.BASE, data);
  }

  async updateVessel(id: string, data: UpdateVesselDto): Promise<Vessel> {
    return this.patch<Vessel>(API_ENDPOINTS.VESSELS.BY_ID(id), data);
  }

  async deleteVessel(id: string): Promise<void> {
    return this.delete(API_ENDPOINTS.VESSELS.BY_ID(id));
  }

  async getVesselCrew(
    vesselId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.get<PaginatedResponse<any>>(
      `${API_ENDPOINTS.VESSELS.CREW(vesselId)}?${params.toString()}`
    );
  }

  async addCrewMember(
    vesselId: string,
    crewMemberId: string,
    position: string,
    startDate: string,
    endDate?: string
  ): Promise<void> {
    return this.post(
      API_ENDPOINTS.VESSELS.CREW(vesselId),
      { crewMemberId, position, startDate, endDate }
    );
  }

  async removeCrewMember(vesselId: string, crewMemberId: string): Promise<void> {
    return this.delete(
      `${API_ENDPOINTS.VESSELS.CREW(vesselId)}/${crewMemberId}`
    );
  }

  async uploadVesselImage(
    vesselId: string,
    file: File,
    isPrimary: boolean = false
  ): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('isPrimary', isPrimary.toString());
    
    return this.post<{ url: string }>(
      `${API_ENDPOINTS.VESSELS.BY_ID(vesselId)}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  async updateVesselStatus(
    vesselId: string,
    status: VesselStatus,
    notes?: string
  ): Promise<Vessel> {
    return this.patch<Vessel>(
      `${API_ENDPOINTS.VESSELS.BY_ID(vesselId)}/status`,
      { status, notes }
    );
  }
}

export const vesselService = new VesselService();
