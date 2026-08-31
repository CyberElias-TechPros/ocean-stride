import { db } from './database2_fixed';
import { STORE_NAMES, type Company, type BaseEntity } from './schemas';

class MultiCompanyService {
  private static instance: MultiCompanyService;
  private currentCompanyId: string | null = null;
  private companyCache: Map<string, Company> = new Map();

  private constructor() {
    this.initialize();
  }

  static getInstance(): MultiCompanyService {
    if (!MultiCompanyService.instance) {
      MultiCompanyService.instance = new MultiCompanyService();
    }
    return MultiCompanyService.instance;
  }

  private async initialize() {
    try {
      await db.init();
      const savedCompanyId = localStorage.getItem('selectedCompanyId');
      if (savedCompanyId) {
        const company = await this.getCompanyById(savedCompanyId);
        if (company) {
          this.currentCompanyId = company.id;
          this.companyCache.set(company.id, company);
        }
      }
    } catch (error) {
      console.error('Failed to initialize MultiCompanyService:', error);
    }
  }

  async setCurrentCompany(companyId: string) {
    const company = await this.getCompanyById(companyId);
    if (!company) {
      throw new Error('Company not found');
    }
    this.currentCompanyId = company.id;
    this.companyCache.set(company.id, company);
    localStorage.setItem('selectedCompanyId', company.id);
    return company;
  }

  getCurrentCompanyId(): string | null {
    return this.currentCompanyId;
  }

  async getCurrentCompany(): Promise<Company | null> {
    if (!this.currentCompanyId) return null;
    return this.getCompanyById(this.currentCompanyId);
  }

  async getCompanyById(id: string): Promise<Company | null> {
    if (this.companyCache.has(id)) {
      return this.companyCache.get(id) || null;
    }
    try {
      const company = await db.getById<Company>(STORE_NAMES.COMPANIES, id);
      if (company) {
        this.companyCache.set(id, company);
      }
      return company || null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  }

  async getAllCompanies(): Promise<Company[]> {
    try {
      return await db.getAll<Company>(STORE_NAMES.COMPANIES);
    } catch (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
  }

  async createCompany(companyData: Omit<Company, 'id' | 'createdAt' | 'updatedAt'>): Promise<Company> {
    try {
      const settings = {
        ...companyData.settings,
      };
      const company = await db.create<Company>(STORE_NAMES.COMPANIES, {
        ...companyData,
        settings,
      });
      
      if (!this.currentCompanyId) {
        await this.setCurrentCompany(company.id);
      }
      
      return company;
    } catch (error) {
      console.error('Error creating company:', error);
      throw error;
    }
  }

  // Add company-scoped query methods
  async queryByCompany<T extends BaseEntity>(
    storeName: string,
    companyId?: string
  ): Promise<T[]> {
    const targetCompanyId = companyId || this.currentCompanyId;
    if (!targetCompanyId) {
      throw new Error('No company selected');
    }
    
    const allItems = await db.getAll<T>(storeName);
    return allItems.filter(item => item.companyId === targetCompanyId);
  }

  // Helper to ensure company ID is set on new entities
  ensureCompanyId<T extends { companyId?: string }>(entity: T): T & { companyId: string } {
    if (!this.currentCompanyId) {
      throw new Error('No company selected');
    }
    return {
      ...entity,
      companyId: entity.companyId || this.currentCompanyId,
    };
  }
}

export const companyService = MultiCompanyService.getInstance();
