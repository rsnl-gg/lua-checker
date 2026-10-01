import type { IBaseEntity } from '../../../shared/types';

export abstract class BaseModel implements IBaseEntity {
  id: number;
  createdAt: string;
  updatedAt: string;

  constructor(data: Partial<IBaseEntity> = {}) {
    this.id = data.id ?? 0;
    this.createdAt = data.createdAt ?? new Date().toISOString();
    this.updatedAt = data.updatedAt ?? new Date().toISOString();
  }

  abstract toDatabase(): Record<string, unknown>;

  static fromDatabase<T extends BaseModel>(
    this: new (data: Record<string, unknown>) => T,
    row: Record<string, unknown>
  ): T {
    return new this(row);
  }

  static get tableName(): string {
    throw new Error('tableName must be implemented by subclass');
  }

  protected static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  protected static toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }

  protected static mapRowToModel(row: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      mapped[this.toCamelCase(key)] = value;
    }
    return mapped;
  }

  protected static mapModelToRow(model: Record<string, unknown>): Record<string, unknown> {
    const mapped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(model)) {
      if (value !== undefined) {
        mapped[this.toSnakeCase(key)] = value;
      }
    }
    return mapped;
  }
}
