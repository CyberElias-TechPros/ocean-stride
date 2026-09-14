import { BaseApi } from '@/lib/api/base-api';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import { 
  CrewMember, 
  CreateCrewMemberDto, 
  UpdateCrewMemberDto,
  CrewStatus,
  Certification,
  PaginatedResponse
} from '@/types';

export class CrewService extends BaseApi {
  constructor() {
    super(getApiUrl(''));
  }

  async getCrewMembers(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: CrewStatus
  ): Promise<PaginatedResponse<CrewMember>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(status && { status }),
    });

    return this.get<PaginatedResponse<CrewMember>>(
      `${API_ENDPOINTS.CREW.BASE}?${params.toString()}`
    );
  }

  async getCrewMemberById(id: string): Promise<CrewMember> {
    return this.get<CrewMember>(API_ENDPOINTS.CREW.BY_ID(id));
  }

  async createCrewMember(data: CreateCrewMemberDto): Promise<CrewMember> {
    return this.post<CrewMember>(API_ENDPOINTS.CREW.BASE, data);
  }

  async updateCrewMember(
    id: string, 
    data: UpdateCrewMemberDto
  ): Promise<CrewMember> {
    return this.patch<CrewMember>(API_ENDPOINTS.CREW.BY_ID(id), data);
  }

  async deleteCrewMember(id: string): Promise<void> {
    return this.delete(API_ENDPOINTS.CREW.BY_ID(id));
  }

  async getCertifications(
    crewMemberId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<PaginatedResponse<Certification>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });

    return this.get<PaginatedResponse<Certification>>(
      `${API_ENDPOINTS.CREW.CERTIFICATIONS(crewMemberId)}?${params.toString()}`
    );
  }

  async addCertification(
    crewMemberId: string,
    data: {
      name: string;
      issuingAuthority: string;
      issueDate: string;
      expiryDate?: string;
      documentUrl?: string;
    }
  ): Promise<Certification> {
    return this.post<Certification>(
      API_ENDPOINTS.CREW.CERTIFICATIONS(crewMemberId),
      data
    );
  }

  async updateCertification(
    crewMemberId: string,
    certificationId: string,
    data: Partial<Certification>
  ): Promise<Certification> {
    return this.patch<Certification>(
      `${API_ENDPOINTS.CREW.CERTIFICATIONS(crewMemberId)}/${certificationId}`,
      data
    );
  }

  async deleteCertification(
    crewMemberId: string,
    certificationId: string
  ): Promise<void> {
    return this.delete(
      `${API_ENDPOINTS.CREW.CERTIFICATIONS(crewMemberId)}/${certificationId}`
    );
  }

  async uploadDocument(
    crewMemberId: string,
    file: File,
    documentType: string,
    metadata: Record<string, any> = {}
  ): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    
    if (metadata) {
      Object.entries(metadata).forEach(([key, value]) => {
        formData.append(key, value);
      });
    }
    
    return this.post<{ url: string; id: string }>(
      `${API_ENDPOINTS.CREW.BY_ID(crewMemberId)}/documents/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  async updateStatus(
    crewMemberId: string,
    status: CrewStatus,
    notes?: string
  ): Promise<CrewMember> {
    return this.patch<CrewMember>(
      `${API_ENDPOINTS.CREW.BY_ID(crewMemberId)}/status`,
      { status, notes }
    );
  }
}

export const crewService = new CrewService();
