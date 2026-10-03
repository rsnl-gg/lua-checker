import { Database as SqlJsDatabase } from 'sql.js';
import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { createRequire } from 'node:module';
import { logger, LogSource } from '../helpers';

const require = createRequire(import.meta.url);
const initSqlJs = require('sql.js');

export class Database {
  private static instance: Database;
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private initialized = false;
  private discarded = false;

  private constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'database.sqlite');
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) return;

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer) as SqlJsDatabase;
    } else {
      this.db = new SQL.Database() as SqlJsDatabase;
    }

    await this.runMigrations();
    this.initialized = true;
    
    logger.info(LogSource.DATABASE, 'Database', `Initialized at: ${this.dbPath}`);
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    this.db.run(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        executed_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      const exists = this.db.exec(
        `SELECT 1 FROM migrations WHERE name = '${migration.name}'`
      );
      
      if (exists.length === 0) {
        logger.info(LogSource.DATABASE, 'Database', `Running migration: ${migration.name}`);
        this.db.run(migration.sql);
        this.db.run(`INSERT INTO migrations (name) VALUES ('${migration.name}')`);
      }
    }

    this.save();
  }

  private getMigrations(): Array<{ name: string; sql: string }> {
    return [
      {
        name: '001_initial_schema',
        sql: `
          CREATE TABLE IF NOT EXISTS app_settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS scan_paths (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            path TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL DEFAULT 'custom',
            color TEXT,
            label TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );
        `,
      },
    ];
  }

  public getConnection(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public discard(): void {
    this.discarded = true;
    if (!this.db) {
      return;
    }
    this.db.close();
    this.db = null;
    this.initialized = false;
  }

  public save(): void {
    if (this.discarded || !this.db) return;
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public async close(): Promise<void> {
    if (this.discarded) {
      this.db = null;
      this.initialized = false;
      return;
    }
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

}

export const getDatabase = () => Database.getInstance();
