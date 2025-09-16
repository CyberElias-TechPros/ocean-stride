import { BaseApi } from '@/lib/api/base-api';
import { API_ENDPOINTS, getApiUrl } from '@/config/api';
import { 
  User, 
  CreateUserDto, 
  UpdateUserDto, 
  UserRole,
  PaginatedResponse
} from '@/types';

export class UserService extends BaseApi {
  constructor() {
    super(getApiUrl(''));
  }

  async getUsers(
    page: number = 1,
    limit: number = 10,
    search: string = '',
    filters: Record<string, any> = {}
  ): Promise<PaginatedResponse<User>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...filters,
    });

    return this.get<PaginatedResponse<User>>(
      `${API_ENDPOINTS.USERS.BASE}?${params.toString()}`
    );
  }

  async getUserById(id: string): Promise<User> {
    return this.get<User>(API_ENDPOINTS.USERS.BY_ID(id));
  }

  async createUser(data: CreateUserDto): Promise<User> {
    return this.post<User>(API_ENDPOINTS.USERS.BASE, data);
  }

  async updateUser(id: string, data: UpdateUserDto): Promise<User> {
    return this.patch<User>(API_ENDPOINTS.USERS.BY_ID(id), data);
  }

  async deleteUser(id: string): Promise<void> {
    return this.delete(API_ENDPOINTS.USERS.BY_ID(id));
  }

  async updateUserRole(id: string, role: UserRole): Promise<User> {
    return this.patch<User>(API_ENDPOINTS.USERS.ROLES(id), { role });
  }

  async getCurrentUser(): Promise<User> {
    return this.get<User>(API_ENDPOINTS.AUTH.ME);
  }

  async uploadProfileImage(userId: string, file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.post<{ url: string }>(
      `${API_ENDPOINTS.USERS.BY_ID(userId)}/upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }
}

export const userService = new UserService();
