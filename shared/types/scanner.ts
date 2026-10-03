export type AppPlatform = 'Windows' | 'Linux' | 'Steamdeck';

const ARSENAL_DOWNLOAD_SLUG: Record<AppPlatform, string> = {
  Windows: 'windows',
  Linux: 'linux',
  Steamdeck: 'steam_os',
};

export function arsenalDownloadUrl(platform: AppPlatform): string {
  return `https://rsnl.gg/downloads/${ARSENAL_DOWNLOAD_SLUG[platform]}`;
}

export interface ISystemInfo {
  platform: AppPlatform;
  osVersion: string;
  arch: string;
  appVersion: string;
  arsenalInstalled: boolean;
  arsenalVersion: string | null;
}

export type ScanPathSource = 'arsenal' | 'hd2mm' | 'custom';

export const ARSENAL_PATH_COLOR = '#FEE800';
export const ARSENAL_PATH_LABEL = 'ARSENAL';
export const HD2MM_PATH_COLOR = '#292929';
export const HD2MM_PATH_LABEL = 'HD2 MOD MANAGER';

export function parseScanPathSource(value: unknown): ScanPathSource {
  if (value === 'arsenal' || value === 'hd2mm') {
    return value;
  }
  return 'custom';
}

export function managedScanPath(source: ScanPathSource): { label: string; color: string } | null {
  if (source === 'arsenal') {
    return { label: ARSENAL_PATH_LABEL, color: ARSENAL_PATH_COLOR };
  }
  if (source === 'hd2mm') {
    return { label: HD2MM_PATH_LABEL, color: HD2MM_PATH_COLOR };
  }
  return null;
}

export const SCAN_PATH_COLORS = [
  ARSENAL_PATH_COLOR,
  HD2MM_PATH_COLOR,
  '#60A5FA',
  '#34D399',
  '#F472B6',
  '#FB923C',
  '#A78BFA',
  '#22D3EE',
  '#F87171',
] as const;

export function readableInk(background: string): '#141414' | '#FFFFFF' {
  const color = normalizeHexColor(background) ?? '#71717A';
  const channel = (hex: string) => {
    const value = parseInt(hex, 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const luminance =
    0.2126 * channel(color.slice(1, 3)) +
    0.7152 * channel(color.slice(3, 5)) +
    0.0722 * channel(color.slice(5, 7));

  return luminance > 0.179 ? '#141414' : '#FFFFFF';
}

export function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  return match ? `#${match[1].toUpperCase()}` : null;
}

export interface IScanPath {
  id: number;
  path: string;
  source: ScanPathSource;
  label: string;
  color: string;
  exists: boolean;
  hasMods: boolean;
}

export function normalizeFolderLabel(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 80);
}

export function folderDisplayName(label: string, folderPath: string): string {
  const normalized = normalizeFolderLabel(label);
  if (normalized) {
    return normalized;
  }

  const parts = folderPath.replace(/[\\/]+$/, '').split(/[\\/]/);
  return parts[parts.length - 1] || folderPath;
}

export interface ISetPathColorRequest {
  id: number;
  color: string;
}

export interface ISetPathLabelRequest {
  id: number;
  label: string;
}

export interface ILuaFile {
  name: string;
  path: string;
  relativePath: string;
}

export function toModRelativePath(modPath: string, filePath: string): string {
  const normalizedMod = modPath.replace(/[\\/]+$/, '').split('\\').join('/');
  const normalizedFile = filePath.split('\\').join('/');
  const prefix = `${normalizedMod}/`;

  const relative = normalizedFile.toLowerCase().startsWith(prefix.toLowerCase())
    ? normalizedFile.slice(prefix.length)
    : normalizedFile.split('/').pop() ?? normalizedFile;
  const slash = relative.lastIndexOf('/');
  return slash === -1 ? '' : relative.slice(0, slash);
}

export interface IScannedMod {
  name: string;
  path: string;
  luaFiles: ILuaFile[];
  storagePath: string;
  storageSource: ScanPathSource;
}

export interface IScannerState {
  platform: AppPlatform;
  arsenalInstalled: boolean;
  reportNexusLua: boolean;
  scanOnStartup: boolean;
  paths: IScanPath[];
  mods: IScannedMod[];
  scannedCount: number;
}
