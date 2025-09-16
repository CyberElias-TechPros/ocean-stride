import BaseService from './baseService';
import { User, UserCreateDto, UserUpdateDto } from '@/types';

class UserService extends BaseService<User, UserCreateDto, UserUpdateDto> {
  constructor() {
    super('/users');
  }

  /**
   * Update the current user's profile
   */
  async updateProfile(data: Partial<UserUpdateDto>): Promise<User> {
    const response = await this.apiClient.patch<User>('/users/me', data);
    return response.data;
  }

  /**
   * Change the current user's password
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await this.apiClient.post('/users/change-password', {
      currentPassword,
      newPassword,
    });
  }

  /**
   * Upload a profile picture
   */
  async uploadProfilePicture(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.apiClient.post<{ url: string }>(
      '/users/me/avatar',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  }

  /**
   * Search users by query
   */
  async search(query: string): Promise<User[]> {
    const response = await this.apiClient.get<User[]>('/users/search', {
      params: { query },
    });
    return response.data;
  }
}

export const userService = new UserService();
export default userService;
