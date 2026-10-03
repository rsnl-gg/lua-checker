import { hasLuaScript } from '@rsnl-gg/library-validator';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { toModRelativePath, type ILuaFile, type IScannedMod, type ScanPathSource } from '../../../shared/types/scanner';
import { normalizePath, type ArsenalNexusMod } from './arsenalInstall';

const PATCH_NAME_RE = /^(.*)\.patch_(\d+)$/i;

export interface ScannedModHit extends IScannedMod {
  hasLua: boolean;
  modId: number | null;
  fileId: number | null;
}

export async function scanModsRoot(
  root: string,
  source: ScanPathSource,
  modsByPath: Map<string, ArsenalNexusMod>,
  onMod: (name: string) => void,
): Promise<ScannedModHit[]> {
  const storage = { path: root, source };
  const entries = await readdir(root, { withFileTypes: true });
  const directories = entries
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => path.join(root, entry.name));
  const rootPatches = entries
    .filter((entry) => entry.isFile() && PATCH_NAME_RE.test(entry.name))
    .map((entry) => path.join(root, entry.name));

  if (directories.length === 0) {
    onMod(path.basename(root));
    return [await scanModFolder(root, modsByPath, storage)];
  }

  const hits: ScannedModHit[] = [];
  if (rootPatches.length > 0) {
    onMod(path.basename(root));
    hits.push(await scanPatchFiles(root, rootPatches, modsByPath, storage));
  }

  for (const directory of directories) {
    onMod(path.basename(directory));
    hits.push(await scanModFolder(directory, modsByPath, storage));
  }

  return hits;
}

async function scanModFolder(
  modPath: string,
  modsByPath: Map<string, ArsenalNexusMod>,
  storage: ModStorage,
): Promise<ScannedModHit> {
  const result = await hasLuaScript(modPath, true);
  return toHit(modPath, result.found, result.extractedPaths, modsByPath, storage);
}

async function scanPatchFiles(
  folder: string,
  patchPaths: string[],
  modsByPath: Map<string, ArsenalNexusMod>,
  storage: ModStorage,
): Promise<ScannedModHit> {
  const extractedPaths: string[] = [];
  let found = false;

  for (const patchPath of patchPaths) {
    const result = await hasLuaScript(patchPath, true);
    if (result.found) {
      found = true;
    }
    extractedPaths.push(...result.extractedPaths);
  }

  return toHit(folder, found, extractedPaths, modsByPath, storage);
}

interface ModStorage {
  path: string;
  source: ScanPathSource;
}

function toHit(
  modPath: string,
  found: boolean,
  extractedPaths: string[],
  modsByPath: Map<string, ArsenalNexusMod>,
  storage: ModStorage,
): ScannedModHit {
  const nexus = modsByPath.get(normalizePath(modPath));
  const luaFiles = uniqueLuaFiles(modPath, extractedPaths);

  return {
    name: nexus?.label || path.basename(modPath),
    path: modPath,
    storagePath: storage.path,
    storageSource: storage.source,
    luaFiles,
    hasLua: found || luaFiles.length > 0,
    modId: nexus?.modId ?? null,
    fileId: nexus?.fileId ?? null,
  };
}

function uniqueLuaFiles(modPath: string, extractedPaths: string[]): ILuaFile[] {
  const seen = new Set<string>();
  const files: ILuaFile[] = [];

  for (const filePath of extractedPaths) {
    const key = normalizePath(filePath);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    files.push({
      name: path.basename(filePath),
      path: filePath,
      relativePath: toModRelativePath(modPath, filePath),
    });
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return files;
}
