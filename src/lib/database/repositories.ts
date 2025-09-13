import { BaseRepository } from './base-repository';
import { schemas } from './schemas';
import { STORES, StoreName } from './config';
import { 
  Company, 
  Seafarer, 
  Vessel, 
  CrewAssignment, 
  PayrollRecord,
  Document,
  Certificate,
  User,
  AuditLog
} from './types';

// Company Repository
export class CompanyRepository extends BaseRepository<Company> {
  protected readonly storeName: StoreName = 'COMPANIES';
  protected readonly schema = schemas.Company;

  async getByCode(code: string): Promise<Company | null> {
    const results = await this.query('code', code);
    return results[0] || null;
  }

  async searchByName(name: string): Promise<Company[]> {
    return this.query('name', IDBKeyRange.bound(name, name + '\uffff', false, false));
  }
}

// Seafarer Repository
export class SeafarerRepository extends BaseRepository<Seafarer> {
  protected readonly storeName: StoreName = 'SEAFARERS';
  protected readonly schema = schemas.Seafarer;

  async getByCompany(companyId: string): Promise<Seafarer[]> {
    return this.query('companyId', companyId);
  }

  async getByStatus(status: Seafarer['employment']['status']): Promise<Seafarer[]> {
    return this.query('status', status);
  }

  async searchByName(name: string, companyId?: string): Promise<Seafarer[]> {
    const allSeafarers = await this.getAll();
    return allSeafarers.filter(seafarer => {
      const fullName = `${seafarer.personalInfo.firstName} ${seafarer.personalInfo.lastName}`.toLowerCase();
      const matchesName = fullName.includes(name.toLowerCase());
      const matchesCompany = companyId ? seafarer.companyId === companyId : true;
      return matchesName && matchesCompany;
    });
  }
}

// Vessel Repository
export class VesselRepository extends BaseRepository<Vessel> {
  protected readonly storeName: StoreName = 'VESSELS';
  protected readonly schema = schemas.Vessel;

  async getByCompany(companyId: string): Promise<Vessel[]> {
    return this.query('companyId', companyId);
  }

  async getByImoNumber(imoNumber: string): Promise<Vessel | null> {
    const results = await this.query('imoNumber', imoNumber);
    return results[0] || null;
  }

  async searchByName(name: string, companyId?: string): Promise<Vessel[]> {
    const allVessels = companyId 
      ? await this.getByCompany(companyId)
      : await this.getAll();
    
    return allVessels.filter(vessel => 
      vessel.name.toLowerCase().includes(name.toLowerCase())
    );
  }
}

// Crew Assignment Repository
export class CrewAssignmentRepository extends BaseRepository<CrewAssignment> {
  protected readonly storeName: StoreName = 'CREW_ASSIGNMENTS';
  protected readonly schema = schemas.CrewAssignment;

  async getByVessel(vesselId: string): Promise<CrewAssignment[]> {
    return this.query('vesselId', vesselId);
  }

  async getBySeafarer(seafarerId: string): Promise<CrewAssignment[]> {
    return this.query('seafarerId', seafarerId);
  }

  async getActiveByVessel(vesselId: string): Promise<CrewAssignment[]> {
    const assignments = await this.getByVessel(vesselId);
    return assignments.filter(a => a.status === 'active');
  }

  async getActiveBySeafarer(seafarerId: string): Promise<CrewAssignment | null> {
    const assignments = await this.getBySeafarer(seafarerId);
    return assignments.find(a => a.status === 'active') || null;
  }
}

// Payroll Repository
export class PayrollRepository extends BaseRepository<PayrollRecord> {
  protected readonly storeName: StoreName = 'PAYROLL_RECORDS';
  protected readonly schema = schemas.PayrollRecord;

  async getBySeafarer(seafarerId: string): Promise<PayrollRecord[]> {
    return this.query('seafarerId', seafarerId);
  }

  async getByPeriod(startDate: string, endDate: string, companyId?: string): Promise<PayrollRecord[]> {
    const allRecords = companyId 
      ? await this.query('companyId', companyId)
      : await this.getAll();
    
    return allRecords.filter(record => 
      record.period.start >= startDate && record.period.end <= endDate
    );
  }

  async getByStatus(status: PayrollRecord['status'], companyId?: string): Promise<PayrollRecord[]> {
    const allRecords = companyId 
      ? await this.query('companyId', companyId)
      : await this.getAll();
    
    return allRecords.filter(record => record.status === status);
  }
}

// Document Repository
export class DocumentRepository extends BaseRepository<Document> {
  protected readonly storeName: StoreName = 'DOCUMENTS';
  protected readonly schema = schemas.Document;

  async getByEntity(entityType: string, entityId: string): Promise<Document[]> {
    const allDocuments = await this.getAll();
    return allDocuments.filter(doc => 
      doc.entityType === entityType && doc.entityId === entityId
    );
  }

  async getByType(entityType: string, docType: string): Promise<Document[]> {
    const allDocuments = await this.getAll();
    return allDocuments.filter(doc => 
      doc.entityType === entityType && doc.type === docType
    );
  }
}

// Certificate Repository
export class CertificateRepository extends BaseRepository<Certificate> {
  protected readonly storeName: StoreName = 'CERTIFICATES';
  protected readonly schema = schemas.Certificate;

  async getBySeafarer(seafarerId: string): Promise<Certificate[]> {
    return this.query('seafarerId', seafarerId);
  }

  async getExpiringSoon(days: number = 30): Promise<Certificate[]> {
    const allCerts = await this.getAll();
    const now = new Date();
    const threshold = new Date();
    threshold.setDate(now.getDate() + days);
    
    return allCerts.filter(cert => {
      const expiryDate = new Date(cert.expiryDate);
      return expiryDate > now && expiryDate <= threshold;
    });
  }
}

// User Repository
export class UserRepository extends BaseRepository<User> {
  protected readonly storeName: StoreName = 'USERS';
  protected readonly schema = schemas.User;

  async getByEmail(email: string): Promise<User | null> {
    const users = await this.query('email', email);
    return users[0] || null;
  }

  async getByCompany(companyId: string): Promise<User[]> {
    return this.query('companyId', companyId);
  }

  async getByRole(role: User['role'], companyId?: string): Promise<User[]> {
    const users = companyId 
      ? await this.getByCompany(companyId)
      : await this.getAll();
    
    return users.filter(user => user.role === role);
  }
}

// Audit Log Repository
export class AuditLogRepository extends BaseRepository<AuditLog> {
  protected readonly storeName: StoreName = 'AUDIT_LOGS';
  protected readonly schema = schemas.AuditLog;

  async getByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
    const allLogs = await this.getAll();
    return allLogs.filter(log => 
      log.entityType === entityType && log.entityId === entityId
    );
  }

  async getByUser(userId: string): Promise<AuditLog[]> {
    return this.query('userId', userId);
  }

  async getByAction(action: string): Promise<AuditLog[]> {
    const allLogs = await this.getAll();
    return allLogs.filter(log => log.action === action);
  }

  async getByDateRange(startDate: string, endDate: string, companyId?: string): Promise<AuditLog[]> {
    const allLogs = companyId 
      ? await this.query('companyId', companyId)
      : await this.getAll();
    
    return allLogs.filter(log => 
      log.timestamp >= startDate && log.timestamp <= endDate
    );
  }
}

// Export all repository instances
export const repositories = {
  companies: new CompanyRepository(),
  seafarers: new SeafarerRepository(),
  vessels: new VesselRepository(),
  crewAssignments: new CrewAssignmentRepository(),
  payroll: new PayrollRepository(),
  documents: new DocumentRepository(),
  certificates: new CertificateRepository(),
  users: new UserRepository(),
  auditLogs: new AuditLogRepository(),
} as const;

// Export types for repositories
export type Repositories = typeof repositories;
