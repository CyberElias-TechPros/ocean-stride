import { AxiosResponse } from 'axios';
import apiClient from './apiClient';

/**
 * Base API service class that provides common CRUD operations
 */
class BaseService<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  protected endpoint: string;

  constructor(endpoint: string) {
    this.endpoint = endpoint;
  }

  /**
   * Fetch all items with optional query parameters
   */
  async getAll(params?: Record<string, any>): Promise<T[]> {
    const response = await apiClient.get<T[]>(this.endpoint, { params });
    return response.data;
  }

  /**
   * Fetch a single item by ID
   */
  async getById(id: string | number): Promise<T> {
    const response = await apiClient.get<T>(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Create a new item
   */
  async create(data: CreateDto): Promise<T> {
    const response = await apiClient.post<T>(this.endpoint, data);
    return response.data;
  }

  /**
   * Update an existing item
   */
  async update(id: string | number, data: UpdateDto): Promise<T> {
    const response = await apiClient.patch<T>(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Delete an item by ID
   */
  async delete(id: string | number): Promise<void> {
    await apiClient.delete(`${this.endpoint}/${id}`);
  }

  /**
   * Make a custom request with full control over the request
   */
  async customRequest<T = any>(config: {
    method: 'get' | 'post' | 'put' | 'delete' | 'patch';
    url: string;
    data?: any;
    params?: Record<string, any>;
  }): Promise<AxiosResponse<T>> {
    return apiClient({
      method: config.method,
      url: config.url,
      data: config.data,
      params: config.params,
    });
  }
}

export default BaseService;
