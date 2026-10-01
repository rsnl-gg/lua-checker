import type { Database as SqlJsDatabase } from 'sql.js';
import { getDatabase } from '../database/Database';
import { logger, LogSource } from '../helpers';
import type { IQueryOptions } from '../../../shared/types';

export abstract class BaseRepository<T, CreateDTO, UpdateDTO> {
  protected abstract tableName: string;
  protected abstract fromRow(row: Record<string, unknown>): T;

  protected get db(): SqlJsDatabase {
    return getDatabase().getConnection();
  }

  protected save(): void {
    getDatabase().save();
  }

  findAll(options?: IQueryOptions): T[] {
    let sql = `SELECT * FROM ${this.tableName}`;

    if (options?.orderBy) {
      sql += ` ORDER BY ${options.orderBy} ${options.orderDirection ?? 'ASC'}`;
    }
    if (options?.limit) {
      sql += ` LIMIT ${options.limit}`;
    }
    if (options?.offset) {
      sql += ` OFFSET ${options.offset}`;
    }

    const result = this.db.exec(sql);
    if (result.length === 0) return [];

    return this.mapResults(result[0]);
  }

  findById(id: number): T | null {
    const sql = `SELECT * FROM ${this.tableName} WHERE id = ${id}`;
    const result = this.db.exec(sql);
    
    logger.debug(LogSource.REPOSITORY, this.tableName, `findById(${id})`, { 
      resultsFound: result.length > 0 ? result[0].values.length : 0 
    });

    if (result.length === 0 || result[0].values.length === 0) {
      return null;
    }

    return this.mapResults(result[0])[0];
  }

  findWhere(conditions: Partial<Record<string, unknown>>): T[] {
    const whereClause = Object.entries(conditions)
      .map(([key, value]) => {
        if (value === null) return `${key} IS NULL`;
        if (typeof value === 'string') return `${key} = '${value}'`;
        return `${key} = ${value}`;
      })
      .join(' AND ');

    const result = this.db.exec(
      `SELECT * FROM ${this.tableName} WHERE ${whereClause}`
    );

    if (result.length === 0) return [];
    return this.mapResults(result[0]);
  }

  findOneWhere(conditions: Partial<Record<string, unknown>>): T | null {
    const results = this.findWhere(conditions);
    return results.length > 0 ? results[0] : null;
  }

  create(data: CreateDTO): T {
    const columns: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        columns.push(this.toSnakeCase(key));
        values.push(value);
      }
    }

    const now = new Date().toISOString();
    columns.push('created_at', 'updated_at');
    values.push(now, now);

    const placeholders = values.map((v) => {
      if (v === null) return 'NULL';
      if (typeof v === 'string') return `'${v}'`;
      if (typeof v === 'boolean') return v ? '1' : '0';
      return String(v);
    });

    const insertSql = `INSERT INTO ${this.tableName} (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    
    logger.debug(LogSource.REPOSITORY, this.tableName, 'Executing INSERT', { sql: insertSql });
    
    this.db.run(insertSql);

    const result = this.db.exec('SELECT last_insert_rowid() as id');
    const insertedId = result[0]?.values[0]?.[0] as number;
    
    logger.debug(LogSource.REPOSITORY, this.tableName, `Inserted with ID: ${insertedId}`);

    this.save();

    const inserted = this.findById(insertedId);
    
    if (!inserted) {
      logger.error(LogSource.REPOSITORY, this.tableName, `Failed to retrieve inserted record with ID: ${insertedId}`);
    } else {
      logger.info(LogSource.REPOSITORY, this.tableName, 'Record created successfully', { id: insertedId });
    }
    
    return inserted!;
  }

  update(id: number, data: UpdateDTO): T | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const updates: string[] = [];

    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        const snakeKey = this.toSnakeCase(key);
        if (value === null) {
          updates.push(`${snakeKey} = NULL`);
        } else if (typeof value === 'string') {
          updates.push(`${snakeKey} = '${value}'`);
        } else if (typeof value === 'boolean') {
          updates.push(`${snakeKey} = ${value ? 1 : 0}`);
        } else {
          updates.push(`${snakeKey} = ${value}`);
        }
      }
    }

    updates.push(`updated_at = '${new Date().toISOString()}'`);

    if (updates.length > 0) {
      this.db.run(
        `UPDATE ${this.tableName} SET ${updates.join(', ')} WHERE id = ${id}`
      );
      this.save();
    }

    return this.findById(id);
  }

  delete(id: number): boolean {
    const existing = this.findById(id);
    if (!existing) return false;

    this.db.run(`DELETE FROM ${this.tableName} WHERE id = ${id}`);
    this.save();

    return true;
  }

  count(conditions?: Partial<Record<string, unknown>>): number {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;

    if (conditions && Object.keys(conditions).length > 0) {
      const whereClause = Object.entries(conditions)
        .map(([key, value]) => {
          if (value === null) return `${key} IS NULL`;
          if (typeof value === 'string') return `${key} = '${value}'`;
          return `${key} = ${value}`;
        })
        .join(' AND ');
      sql += ` WHERE ${whereClause}`;
    }

    const result = this.db.exec(sql);
    return result[0].values[0][0] as number;
  }

  exists(id: number): boolean {
    const result = this.db.exec(
      `SELECT 1 FROM ${this.tableName} WHERE id = ${id} LIMIT 1`
    );
    return result.length > 0 && result[0].values.length > 0;
  }

  protected mapResults(result: { columns: string[]; values: unknown[][] }): T[] {
    const { columns, values } = result;
    
    return values.map((row) => {
      const obj: Record<string, unknown> = {};
      columns.forEach((col, index) => {
        obj[col] = row[index];
      });
      return this.fromRow(obj);
    });
  }

  protected toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}
