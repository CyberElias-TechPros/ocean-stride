import { repositories } from '../database';
import { QueryClient } from '@tanstack/react-query';

// Create a query client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// API response type
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
}

// API error class
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 500, data: any = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }
}

// Helper function to handle API responses
const handleResponse = async <T>(response: Response): Promise<ApiResponse<T>> => {
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) {
    throw new ApiError(
      data.message || 'An error occurred',
      response.status,
      data
    );
  }
  
  return {
    data: data as T,
    error: null,
    status: response.status,
  };
};

// API service with IndexedDB fallback
export const api = {
  // Generic CRUD operations
  async find<T>(
    entity: keyof typeof repositories,
    id: string
  ): Promise<ApiResponse<T>> {
    try {
      const repo = repositories[entity];
      const data = await repo.getById(id);
      if (!data) {
        throw new ApiError('Not found', 404);
      }
      return { data: data as T, error: null, status: 200 };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch data',
        500
      );
    }
  },

  async findAll<T>(
    entity: keyof typeof repositories,
    query?: Record<string, any>
  ): Promise<ApiResponse<T[]>> {
    try {
      const repo = repositories[entity];
      let data;
      
      if (query) {
        // Apply filters if query parameters are provided
        const allData = await repo.getAll();
        data = allData.filter(item => {
          return Object.entries(query).every(([key, value]) => {
            // Handle nested properties with dot notation
            const keys = key.split('.');
            let propValue = item;
            
            for (const k of keys) {
              if (propValue == null) return false;
              propValue = propValue[k];
            }
            
            return propValue === value;
          });
        });
      } else {
        data = await repo.getAll();
      }
      
      return { data: data as T[], error: null, status: 200 };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to fetch data',
        500
      );
    }
  },

  async create<T>(
    entity: keyof typeof repositories,
    data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ApiResponse<T>> {
    try {
      const repo = repositories[entity];
      const created = await repo.create(data);
      return { data: created as T, error: null, status: 201 };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to create record',
        400
      );
    }
  },

  async update<T>(
    entity: keyof typeof repositories,
    id: string,
    updates: Partial<T>
  ): Promise<ApiResponse<T>> {
    try {
      const repo = repositories[entity];
      const updated = await repo.update(id, updates);
      return { data: updated as T, error: null, status: 200 };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to update record',
        400
      );
    }
  },

  async delete(
    entity: keyof typeof repositories,
    id: string
  ): Promise<ApiResponse<boolean>> {
    try {
      const repo = repositories[entity];
      await repo.delete(id);
      return { data: true, error: null, status: 204 };
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : 'Failed to delete record',
        400
      );
    }
  },

  // Custom methods for specific entities
  seafarers: {
    async searchByName(name: string, companyId?: string) {
      const repo = repositories.seafarers as any;
      if (repo.searchByName) {
        return repo.searchByName(name, companyId);
      }
      return [];
    },
    
    async getByStatus(status: string) {
      const repo = repositories.seafarers as any;
      if (repo.getByStatus) {
        return repo.getByStatus(status);
      }
      return [];
    },
  },
  
  vessels: {
    async searchByName(name: string, companyId?: string) {
      const repo = repositories.vessels as any;
      if (repo.searchByName) {
        return repo.searchByName(name, companyId);
      }
      return [];
    },
  },
  
  crewAssignments: {
    async getByVessel(vesselId: string) {
      const repo = repositories.crewAssignments as any;
      if (repo.getByVessel) {
        return repo.getByVessel(vesselId);
      }
      return [];
    },
    
    async getBySeafarer(seafarerId: string) {
      const repo = repositories.crewAssignments as any;
      if (repo.getBySeafarer) {
        return repo.getBySeafarer(seafarerId);
      }
      return [];
    },
  },
  
  payroll: {
    async getByPeriod(startDate: string, endDate: string, companyId?: string) {
      const repo = repositories.payroll as any;
      if (repo.getByPeriod) {
        return repo.getByPeriod(startDate, endDate, companyId);
      }
      return [];
    },
  },
};

// React Query hooks
export const queryKeys = {
  // Generic keys
  entity: (entity: string, id?: string) => [entity, { id }],
  entityList: (entity: string, filters?: Record<string, any>) => [entity, 'list', filters || {}],
  
  // Specific entity keys
  companies: {
    all: ['companies'],
    list: (filters?: any) => [...queryKeys.companies.all, 'list', filters || {}],
    detail: (id: string) => [...queryKeys.companies.all, 'detail', id],
  },
  
  seafarers: {
    all: ['seafarers'],
    list: (filters?: any) => [...queryKeys.seafarers.all, 'list', filters || {}],
    detail: (id: string) => [...queryKeys.seafarers.all, 'detail', id],
    search: (query: string, companyId?: string) => [
      ...queryKeys.seafarers.all, 
      'search', 
      { query, companyId }
    ],
    byStatus: (status: string) => [
      ...queryKeys.seafarers.all,
      'status',
      status,
    ],
  },
  
  vessels: {
    all: ['vessels'],
    list: (filters?: any) => [...queryKeys.vessels.all, 'list', filters || {}],
    detail: (id: string) => [...queryKeys.vessels.all, 'detail', id],
    search: (query: string, companyId?: string) => [
      ...queryKeys.vessels.all,
      'search',
      { query, companyId },
    ],
  },
  
  crewAssignments: {
    all: ['crewAssignments'],
    list: (filters?: any) => [...queryKeys.crewAssignments.all, 'list', filters || {}],
    byVessel: (vesselId: string) => [
      ...queryKeys.crewAssignments.all,
      'vessel',
      vesselId,
    ],
    bySeafarer: (seafarerId: string) => [
      ...queryKeys.crewAssignments.all,
      'seafarer',
      seafarerId,
    ],
  },
  
  payroll: {
    all: ['payroll'],
    list: (filters?: any) => [...queryKeys.payroll.all, 'list', filters || {}],
    bySeafarer: (seafarerId: string) => [
      ...queryKeys.payroll.all,
      'seafarer',
      seafarerId,
    ],
    byPeriod: (startDate: string, endDate: string, companyId?: string) => [
      ...queryKeys.payroll.all,
      'period',
      { startDate, endDate, companyId },
    ],
  },
};

// React Query hooks
export * from './hooks';

// Export all repositories for direct access when needed
export { repositories };
