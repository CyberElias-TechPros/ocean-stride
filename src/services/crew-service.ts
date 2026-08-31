import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import type {
  Seafarer,
  SeafarerDocument,
  Certificate,
} from '@/lib/schemas_v2';
import type {
  CrewMember,
  CreateCrewMemberDto,
  UpdateCrewMemberDto,
  CrewStatus,
  Certification,
  PaginatedResponse,
} from '@/types';

function mapStatus(status: Seafarer['employment']['status']): CrewStatus {
  switch (status) {
    case 'onboard':
      return 'active';
    case 'on_leave':
      return 'on_leave';
    case 'on_training':
      return 'inactive';
    case 'inactive':
      return 'inactive';
  }
}

function toCrewMember(seafarer: Seafarer): CrewMember {
  return {
    id: seafarer.id,
    firstName: seafarer.personalInfo?.firstName || '',
    lastName: seafarer.personalInfo?.lastName || '',
    email: seafarer.personalInfo?.contact?.email || '',
    phoneNumber: seafarer.personalInfo?.contact?.phone,
    dateOfBirth: seafarer.personalInfo?.dateOfBirth || '',
    nationality: seafarer.personalInfo?.nationality || '',
    rank: seafarer.employment?.rank || '',
    status: mapStatus(seafarer.employment?.status),
    vesselId: seafarer.employment?.currentVesselId,
    certifications: (seafarer.documents ?? []).map(toCertificationFromSeafarerDocument),
    createdAt: seafarer.createdAt,
    updatedAt: seafarer.updatedAt,
  };
}

function toCertificationFromSeafarerDocument(doc: SeafarerDocument): Certification {
  return {
    id: doc.number,
    name: doc.type,
    issuingAuthority: doc.issuedBy,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    documentUrl: doc.fileUrl,
    createdAt: '',
    updatedAt: '',
  };
}

function toCertification(doc: Certificate): Certification {
  return {
    id: doc.id,
    name: doc.name,
    issuingAuthority: doc.issuingAuthority,
    issueDate: doc.issueDate,
    expiryDate: doc.expiryDate,
    documentUrl: doc.documentUrl,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function baseSeafarerInput(data: CreateCrewMemberDto): Omit<Seafarer, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> {
  return {
    personalInfo: {
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      placeOfBirth: '',
      nationality: data.nationality,
      maritalStatus: 'single',
      gender: 'prefer_not_to_say',
      address: { street: '', city: '', state: '', postalCode: '', country: data.nationality },
      contact: {
        email: data.email,
        phone: data.phoneNumber || '',
        emergencyContact: { name: '', relationship: '', phone: '' },
      },
    },
    documents: [],
    payrolls: [],
    emergencyContacts: [],
    employment: {
      rank: data.rank,
      rankId: '',
      employeeId: '',
      department: 'other',
      status: data.status === 'active' ? 'onboard' : data.status === 'on_leave' ? 'on_leave' : 'inactive',
      baseWage: 0,
      wageCurrency: 'USD',
      workHoursPerWeek: 48,
      leaveDaysPerYear: 30,
      employmentType: 'contract',
      employmentStatus: 'active',
      joinedDate: new Date().toISOString(),
    },
    trainings: [],
    medicals: [],
    skills: [],
    languages: [],
  };
}

export class CrewService {
  async getCrewMembers(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: CrewStatus,
  ): Promise<PaginatedResponse<CrewMember>> {
    const all = await db.getAll<Seafarer>(STORE_NAMES.SEAFARERS);
    const q = search.trim().toLowerCase();
    const filtered = all
      .filter((s) => {
        const name = `${s.personalInfo?.firstName || ''} ${s.personalInfo?.lastName || ''}`.toLowerCase();
        const email = (s.personalInfo?.contact?.email || '').toLowerCase();
        const rank = (s.employment?.rank || '').toLowerCase();
        const matchesSearch = !q || name.includes(q) || email.includes(q) || rank.includes(q);
        const matchesStatus = !status || mapStatus(s.employment?.status) === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit).map(toCrewMember);
    return {
      data,
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async getCrewMemberById(id: string): Promise<CrewMember> {
    const member = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, id);
    if (!member) throw new Error('Crew member not found');
    return toCrewMember(member);
  }

  async createCrewMember(data: CreateCrewMemberDto): Promise<CrewMember> {
    const created = await db.createSeafarer(baseSeafarerInput(data));
    return toCrewMember(created);
  }

  async updateCrewMember(id: string, data: UpdateCrewMemberDto): Promise<CrewMember> {
    const existing = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, id);
    if (!existing) throw new Error('Crew member not found');

    const next: Seafarer = {
      ...existing,
      personalInfo: {
        ...existing.personalInfo,
        firstName: data.firstName ?? existing.personalInfo.firstName,
        lastName: data.lastName ?? existing.personalInfo.lastName,
        contact: {
          ...existing.personalInfo.contact,
          email: data.email ?? existing.personalInfo.contact.email,
          phone: data.phoneNumber ?? existing.personalInfo.contact.phone,
        },
        dateOfBirth: data.dateOfBirth ?? existing.personalInfo.dateOfBirth,
        nationality: data.nationality ?? existing.personalInfo.nationality,
      },
      employment: {
        ...existing.employment,
        rank: data.rank ?? existing.employment.rank,
        currentVesselId: data.vesselId ?? existing.employment.currentVesselId,
        status: data.status ? (data.status === 'active' ? 'onboard' : data.status === 'on_leave' ? 'on_leave' : 'inactive') : existing.employment.status,
      },
    };

    const updated = await db.update<Seafarer>(STORE_NAMES.SEAFARERS, id, next as Partial<Seafarer>);
    return toCrewMember(updated);
  }

  async deleteCrewMember(id: string): Promise<void> {
    await db.delete(STORE_NAMES.SEAFARERS, id);
  }

  async getCertifications(
    crewMemberId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<Certification>> {
    const all = await db.getAll<Certificate>(STORE_NAMES.CERTIFICATES);
    const filtered = all.filter((c) => c.seafarerId === crewMemberId);
    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toCertification),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async addCertification(
    crewMemberId: string,
    data: {
      name: string;
      issuingAuthority: string;
      issueDate: string;
      expiryDate?: string;
      documentUrl?: string;
    },
  ): Promise<Certification> {
    const created = await db.createCertificate({
      seafarerId: crewMemberId,
      name: data.name,
      type: 'certificate',
      number: '',
      issuingAuthority: data.issuingAuthority,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate || '',
      status: data.expiryDate ? 'valid' : 'valid',
      documentUrl: data.documentUrl,
    });
    return toCertification(created);
  }

  async updateCertification(
    crewMemberId: string,
    certificationId: string,
    data: Partial<Certification>,
  ): Promise<Certification> {
    const existing = await db.get<Certificate>(STORE_NAMES.CERTIFICATES, certificationId);
    if (!existing || existing.seafarerId !== crewMemberId) throw new Error('Certification not found');
    const updated = await db.update<Certificate>(STORE_NAMES.CERTIFICATES, certificationId, {
      ...data,
      issuingAuthority: data.issuingAuthority ?? existing.issuingAuthority,
    } as Partial<Certificate>);
    return toCertification(updated);
  }

  async deleteCertification(crewMemberId: string, certificationId: string): Promise<void> {
    const existing = await db.get<Certificate>(STORE_NAMES.CERTIFICATES, certificationId);
    if (!existing || existing.seafarerId !== crewMemberId) throw new Error('Certification not found');
    await db.delete(STORE_NAMES.CERTIFICATES, certificationId);
  }

  async uploadDocument(
    crewMemberId: string,
    file: File,
    documentType: string,
    metadata: Record<string, any> = {},
  ): Promise<{ url: string; id: string }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', documentType);
    formData.append('relatedTo', 'seafarer');

    for (const [key, value] of Object.entries(metadata)) {
      formData.append(key, String(value));
    }

    const url = `${(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || ''}/api/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Upload failed: ${text}`);
    }

    const { key, url: uploadedUrl } = (await response.json()) as { key: string; url: string };
    const document = await db.createDocument({
      name: file.name,
      type: documentType,
      fileUrl: uploadedUrl,
      fileSize: file.size,
      mimeType: file.type,
      relatedTo: { entityType: 'seafarer', entityId: crewMemberId, entityName: '' },
    });

    return { url: uploadedUrl, id: document.id };
  }

  async updateStatus(crewMemberId: string, status: CrewStatus, _notes?: string): Promise<CrewMember> {
    const existing = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId);
    if (!existing) throw new Error('Crew member not found');
    const nextStatus: Seafarer['employment']['status'] =
      status === 'active' ? 'onboard' : status === 'on_leave' ? 'on_leave' : 'inactive';
    const updated = await db.update<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId, {
      employment: { ...existing.employment, status: nextStatus },
    } as Partial<Seafarer>);
    return toCrewMember(updated);
  }
}

export const crewService = new CrewService();
