import type { IApiResponse, IQueryOptions, IPaginatedResponse, IPaginationParams } from '../../../shared/types';
import type { BaseRepository } from '../repositories/BaseRepository';

export abstract class BaseService<T, CreateDTO, UpdateDTO> {
  protected abstract repository: BaseRepository<T, CreateDTO, UpdateDTO>;

  protected success<R>(data: R, message?: string): IApiResponse<R> {
    return { success: true, data, message };
  }

  protected error<R>(error: string): IApiResponse<R> {
    return { success: false, error };
  }

  async findAll(options?: IQueryOptions): Promise<IApiResponse<T[]>> {
    try {
      const items = this.repository.findAll(options);
      return this.success(items);
    } catch (err) {
      return this.error(`Failed to fetch items: ${(err as Error).message}`);
    }
  }

  async findPaginated(
    params: IPaginationParams,
    options?: Omit<IQueryOptions, 'limit' | 'offset'>
  ): Promise<IApiResponse<IPaginatedResponse<T>>> {
    try {
      const { page, limit } = params;
      const offset = (page - 1) * limit;

      const items = this.repository.findAll({ ...options, limit, offset });
      const total = this.repository.count();
      const totalPages = Math.ceil(total / limit);

      return this.success({ items, total, page, limit, totalPages });
    } catch (err) {
      return this.error(`Failed to fetch paginated items: ${(err as Error).message}`);
    }
  }

  async findById(id: number): Promise<IApiResponse<T | null>> {
    try {
      const item = this.repository.findById(id);
      if (!item) {
        return this.error('Item not found');
      }
      return this.success(item);
    } catch (err) {
      return this.error(`Failed to fetch item: ${(err as Error).message}`);
    }
  }

  async create(data: CreateDTO): Promise<IApiResponse<T>> {
    try {
      const validationError = await this.validateCreate(data);
      if (validationError) {
        return this.error(validationError);
      }

      const item = this.repository.create(data);
      return this.success(item, 'Item created successfully');
    } catch (err) {
      return this.error(`Failed to create item: ${(err as Error).message}`);
    }
  }

  async update(id: number, data: UpdateDTO): Promise<IApiResponse<T | null>> {
    try {
      if (!this.repository.exists(id)) {
        return this.error('Item not found');
      }

      const validationError = await this.validateUpdate(id, data);
      if (validationError) {
        return this.error(validationError);
      }

      const item = this.repository.update(id, data);
      return this.success(item, 'Item updated successfully');
    } catch (err) {
      return this.error(`Failed to update item: ${(err as Error).message}`);
    }
  }

  async delete(id: number): Promise<IApiResponse<boolean>> {
    try {
      const deletionError = await this.validateDelete(id);
      if (deletionError) {
        return this.error(deletionError);
      }

      const deleted = this.repository.delete(id);
      if (!deleted) {
        return this.error('Item not found');
      }
      return this.success(true, 'Item deleted successfully');
    } catch (err) {
      return this.error(`Failed to delete item: ${(err as Error).message}`);
    }
  }

  protected async validateCreate(_data: CreateDTO): Promise<string | null> {
    return null;
  }

  protected async validateUpdate(_id: number, _data: UpdateDTO): Promise<string | null> {
    return null;
  }

  protected async validateDelete(_id: number): Promise<string | null> {
    return null;
  }
}
