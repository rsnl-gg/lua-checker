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
    // Add your migrations here following this pattern:
    // {
    //   name: '001_create_your_table',
    //   sql: `
    //     CREATE TABLE IF NOT EXISTS your_table (
    //       id INTEGER PRIMARY KEY AUTOINCREMENT,
    //       name TEXT NOT NULL,
    //       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    //       updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    //     )
    //   `,
    // },
    return [];
  }

  public getConnection(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  public save(): void {
    if (!this.db) return;
    
    const data = this.db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this.dbPath, buffer);
  }

  public async close(): Promise<void> {
    if (this.db) {
      this.save();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }

  public exportDatabase(): Uint8Array | null {
    if (!this.db) return null;
    return this.db.export();
  }

  public async importDatabase(data: Uint8Array): Promise<void> {
    const SQL = await initSqlJs();
    
    if (this.db) {
      this.db.close();
    }
    
    this.db = new SQL.Database(data) as SqlJsDatabase;
    this.save();
  }
}

export const getDatabase = () => Database.getInstance();
