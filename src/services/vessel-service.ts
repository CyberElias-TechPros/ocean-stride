import { db } from '@/lib/database2';
import { STORE_NAMES } from '@/lib/schemas';
import type { Vessel as DbVessel, Seafarer } from '@/lib/schemas_v2';
import {
  Vessel,
  VesselCreateDto,
  VesselUpdateDto,
  VesselStatus,
  PaginatedResponse,
} from '@/types';

function toVessel(v: DbVessel): Vessel {
  return v as unknown as Vessel;
}

function toCreateInput(data: VesselCreateDto): Omit<DbVessel, 'id' | 'createdAt' | 'updatedAt' | 'companyId' | 'createdBy' | 'updatedBy'> {
  return {
    name: data.name,
    imoNumber: data.imoNumber,
    type: data.type,
    flag: data.flag || '',
    yearBuilt: data.yearBuilt || 0,
    grossTonnage: data.grossTonnage || 0,
    deadweight: 0,
    callSign: '',
    mmsi: '',
    status: (data.status || 'active') as DbVessel['status'],
  };
}

export class VesselService {
  async getVessels(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    status?: VesselStatus,
  ): Promise<PaginatedResponse<Vessel>> {
    const all = await db.getAll<DbVessel>(STORE_NAMES.VESSELS);
    const q = search.trim().toLowerCase();
    const filtered = all
      .filter((v) => {
        const matchesSearch = !q || v.name.toLowerCase().includes(q) || v.imoNumber.toLowerCase().includes(q);
        const matchesStatus = !status || v.status === status;
        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));

    const start = (page - 1) * limit;
    return {
      data: filtered.slice(start, start + limit).map(toVessel),
      total: filtered.length,
      page,
      limit,
      totalPages: Math.ceil(filtered.length / limit),
    };
  }

  async getVesselById(id: string): Promise<Vessel> {
    const vessel = await db.get<DbVessel>(STORE_NAMES.VESSELS, id);
    if (!vessel) throw new Error('Vessel not found');
    return toVessel(vessel);
  }

  async createVessel(data: VesselCreateDto): Promise<Vessel> {
    return toVessel(await db.createVessel(toCreateInput(data)));
  }

  async updateVessel(id: string, data: VesselUpdateDto): Promise<Vessel> {
    const existing = await db.get<DbVessel>(STORE_NAMES.VESSELS, id);
    if (!existing) throw new Error('Vessel not found');
    const updated = await db.update<DbVessel>(STORE_NAMES.VESSELS, id, {
      ...data,
      status: data.status as DbVessel['status'],
    } as Partial<DbVessel>);
    return toVessel(updated);
  }

  async deleteVessel(id: string): Promise<void> {
    await db.delete(STORE_NAMES.VESSELS, id);
  }

  async getVesselCrew(
    vesselId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<PaginatedResponse<any>> {
    const all = await db.getAll<Seafarer>(STORE_NAMES.SEAFARERS);
    const members = all.filter((s) => s.employment?.currentVesselId === vesselId);
    const start = (page - 1) * limit;
    return {
      data: members.slice(start, start + limit),
      total: members.length,
      page,
      limit,
      totalPages: Math.ceil(members.length / limit),
    };
  }

  async addCrewMember(
    vesselId: string,
    crewMemberId: string,
    position: string,
    _startDate: string,
    _endDate?: string,
  ): Promise<void> {
    const existing = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId);
    if (!existing) throw new Error('Seafarer not found');
    await db.update<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId, {
      employment: {
        ...existing.employment,
        rank: position,
        currentVesselId: vesselId,
        currentVesselName: '',
      },
    } as Partial<Seafarer>);
  }

  async removeCrewMember(vesselId: string, crewMemberId: string): Promise<void> {
    const existing = await db.get<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId);
    if (!existing || existing.employment?.currentVesselId !== vesselId) return;
    await db.update<Seafarer>(STORE_NAMES.SEAFARERS, crewMemberId, {
      employment: { ...existing.employment, currentVesselId: undefined },
    } as Partial<Seafarer>);
  }

  async uploadVesselImage(vesselId: string, file: File, _isPrimary: boolean = false): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const url = `${(import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') || ''}/api/upload`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('authToken') || ''}`,
      },
      body: formData,
    });
    if (!response.ok) throw new Error('Upload failed');
    return (await response.json()) as { url: string };
  }

  async updateVesselStatus(vesselId: string, status: VesselStatus, _notes?: string): Promise<Vessel> {
    const existing = await db.get<DbVessel>(STORE_NAMES.VESSELS, vesselId);
    if (!existing) throw new Error('Vessel not found');
    const updated = await db.update<DbVessel>(STORE_NAMES.VESSELS, vesselId, {
      status: status as DbVessel['status'],
    } as Partial<DbVessel>);
    return toVessel(updated);
  }
}

export const vesselService = new VesselService();
