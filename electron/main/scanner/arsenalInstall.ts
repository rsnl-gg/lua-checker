import { app } from 'electron';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export interface ArsenalNexusMod {
  modId: number;
  fileId: number;
  label?: string;
}

export interface ArsenalInstall {
  dataFile: string;
  modsPath: string | null;
  version: string | null;
  modsByPath: Map<string, ArsenalNexusMod>;
}

export function normalizePath(value: string): string {
  const resolved = path.resolve(value);
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function locateArsenalDataFile(): string | null {
  for (const candidate of arsenalDataCandidates()) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function readArsenalInstall(): ArsenalInstall | null {
  const dataFile = locateArsenalDataFile();
  if (!dataFile) {
    return null;
  }

  let parsed: unknown = {};
  try {
    parsed = JSON.parse(fs.readFileSync(dataFile, 'utf8')) as unknown;
  } catch {
    parsed = {};
  }

  const root = parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : {};
  const configured = typeof root.userModsDir === 'string' ? root.userModsDir.trim() : '';
  const modsPath = configured
    ? path.resolve(configured)
    : path.join(path.dirname(dataFile), 'mods');

  return {
    dataFile,
    modsPath,
    version: readArsenalVersion(root),
    modsByPath: collectNexusMods(parsed),
  };
}

function readArsenalVersion(root: Record<string, unknown>): string | null {
  const direct = cleanVersion(root.appVersion);
  if (direct) {
    return direct;
  }

  const infos = root.systemInfos;
  if (!infos || typeof infos !== 'object') {
    return null;
  }

  return cleanVersion((infos as Record<string, unknown>).appVersion);
}

function cleanVersion(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed === '(version error)') {
    return null;
  }

  return trimmed;
}

function arsenalDataCandidates(): string[] {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA
      ?? app.getPath('appData').replace(/Roaming/gi, 'Local');
    return [path.join(localAppData, 'hd2arsenal', 'hd2a_data.json')];
  }

  const configHome = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config');
  const fromConfig = path.join(configHome, 'hd2arsenal', 'hd2a_data.json');
  const fromAppData = path.join(
    app.getPath('appData').replace(/Roaming/gi, 'Local'),
    'hd2arsenal',
    'hd2a_data.json',
  );

  return fromConfig === fromAppData ? [fromConfig] : [fromConfig, fromAppData];
}

function collectNexusMods(node: unknown): Map<string, ArsenalNexusMod> {
  const mods = new Map<string, ArsenalNexusMod>();
  walk(node, mods);
  return mods;
}

function walk(node: unknown, mods: Map<string, ArsenalNexusMod>): void {
  if (!node || typeof node !== 'object') {
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walk(item, mods);
    }
    return;
  }

  const record = node as Record<string, unknown>;
  const modPath = typeof record.path === 'string' ? record.path.trim() : '';
  const nexus = record.nexusData;
  if (modPath && nexus && typeof nexus === 'object') {
    const nexusRecord = nexus as Record<string, unknown>;
    const modId = parsePositiveInt(nexusRecord.modId);
    const fileId = parsePositiveInt(nexusRecord.fileId);
    if (modId !== null && fileId !== null) {
      const label = typeof record.label === 'string' ? record.label.trim() : '';
      mods.set(normalizePath(modPath), {
        modId,
        fileId,
        label: label || undefined,
      });
    }
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      walk(value, mods);
    }
  }
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1) {
      return parsed;
    }
  }
  return null;
}
