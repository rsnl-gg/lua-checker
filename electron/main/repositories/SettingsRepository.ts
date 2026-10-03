import { parseScanPathSource, toModRelativePath, type ILuaFile, type IScannedMod } from '../../../shared/types/scanner';
import { getDatabase } from '../database/Database';

const REPORT_NEXUS_LUA_KEY = 'report_nexus_lua';
const SCAN_ON_STARTUP_KEY = 'scan_on_startup';
const LAST_SCAN_KEY = 'last_scan';

export interface IStoredScan {
  mods: IScannedMod[];
  scannedCount: number;
}

export class SettingsRepository {
  private static instance: SettingsRepository;

  public static getInstance(): SettingsRepository {
    if (!SettingsRepository.instance) {
      SettingsRepository.instance = new SettingsRepository();
    }
    return SettingsRepository.instance;
  }

  getReportNexusLua(): boolean {
    return this.getFlag(REPORT_NEXUS_LUA_KEY, true);
  }

  setReportNexusLua(enabled: boolean): void {
    this.setFlag(REPORT_NEXUS_LUA_KEY, enabled);
  }

  getScanOnStartup(): boolean {
    return this.getFlag(SCAN_ON_STARTUP_KEY, false);
  }

  setScanOnStartup(enabled: boolean): void {
    this.setFlag(SCAN_ON_STARTUP_KEY, enabled);
  }

  getLastScan(): IStoredScan | null {
    const raw = this.getValue(LAST_SCAN_KEY);
    if (!raw) {
      return null;
    }

    try {
      return parseStoredScan(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  setLastScan(scan: IStoredScan): void {
    this.setValue(LAST_SCAN_KEY, JSON.stringify(scan));
  }

  private getFlag(key: string, fallback: boolean): boolean {
    const value = this.getValue(key);
    if (value === null) {
      return fallback;
    }
    return value === '1';
  }

  private setFlag(key: string, enabled: boolean): void {
    this.setValue(key, enabled ? '1' : '0');
  }

  private getValue(key: string): string | null {
    const statement = getDatabase().getConnection().prepare(
      'SELECT value FROM app_settings WHERE key = ?',
    );
    try {
      statement.bind([key]);
      if (!statement.step()) {
        return null;
      }
      const value = statement.getAsObject().value;
      return typeof value === 'string' ? value : value == null ? null : String(value);
    } finally {
      statement.free();
    }
  }

  private setValue(key: string, value: string): void {
    getDatabase().getConnection().run(
      `INSERT INTO app_settings (key, value, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
      [key, value, new Date().toISOString()],
    );
    getDatabase().save();
  }
}

function parseStoredScan(value: unknown): IStoredScan | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (!Array.isArray(record.mods) || typeof record.scannedCount !== 'number') {
    return null;
  }

  const mods = record.mods.flatMap((item) => {
    const mod = parseStoredMod(item);
    return mod ? [mod] : [];
  });

  return {
    mods,
    scannedCount: record.scannedCount,
  };
}

function parseStoredMod(value: unknown): IScannedMod | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = record.name;
  const modPath = record.path;
  const luaFileValues = record.luaFiles;
  if (typeof name !== 'string' || typeof modPath !== 'string' || !Array.isArray(luaFileValues)) {
    return null;
  }

  const luaFiles = luaFileValues.flatMap((item) => {
    const file = parseStoredLuaFile(item, modPath);
    return file ? [file] : [];
  });

  const storageSource = parseScanPathSource(record.storageSource);
  const storagePath = typeof record.storagePath === 'string' ? record.storagePath : '';

  return {
    name,
    path: modPath,
    luaFiles,
    storagePath,
    storageSource,
  };
}

function parseStoredLuaFile(value: unknown, modPath: string): ILuaFile | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.name !== 'string' || typeof record.path !== 'string') {
    return null;
  }

  const relativePath = typeof record.relativePath === 'string' && record.relativePath.length > 0
    ? record.relativePath
    : toModRelativePath(modPath, record.path);

  return {
    name: record.name,
    path: record.path,
    relativePath,
  };
}

export const getSettingsRepository = () => SettingsRepository.getInstance();
