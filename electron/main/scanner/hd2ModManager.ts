import { execFile } from 'node:child_process';
import fs from 'node:fs';
import { readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { normalizePath } from './arsenalInstall';

const EXE_NAME = 'helldivers2modmanager.exe';
const SETTINGS_NAME = 'settings.json';
const MAX_HITS = 8;

const SKIP_DIRECTORIES = new Set([
  '$recycle.bin',
  '.cache',
  '.git',
  '.local',
  '.npm',
  '.pnpm',
  '.steam',
  '.var',
  '.wine',
  '.yarn',
  'appdata',
  'cache',
  'dev',
  'node_modules',
  'package cache',
  'proc',
  'run',
  'snap',
  'sys',
  'system volume information',
  'temp',
  'tmp',
  'windows',
  'windowsapps',
  'winsxs',
]);

export interface Hd2ModManagerInstall {
  exePath: string;
  settingsFile: string | null;
  storageDirectory: string;
  modsPath: string;
}

export async function readHd2ModManagerInstall(): Promise<Hd2ModManagerInstall | null> {
  const exePaths = await findManagerExecutables();
  const installs = exePaths
    .map(readInstallBesideExe)
    .filter((install): install is Hd2ModManagerInstall => install !== null);

  installs.sort((left, right) => rankInstall(right) - rankInstall(left));
  return installs[0] ?? null;
}

function readInstallBesideExe(exePath: string): Hd2ModManagerInstall | null {
  const settingsFile = path.join(path.dirname(exePath), SETTINGS_NAME);
  const hasSettings = fs.existsSync(settingsFile);
  const storageDirectory = (hasSettings ? readStorageDirectory(settingsFile, exePath) : null)
    ?? defaultStorageDirectory(exePath);
  if (!storageDirectory) {
    return null;
  }

  return {
    exePath,
    settingsFile: hasSettings ? settingsFile : null,
    storageDirectory,
    modsPath: modsDirectory(storageDirectory),
  };
}

function readStorageDirectory(settingsFile: string, exePath: string): string | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    const storage = (parsed as Record<string, unknown>).StorageDirectory;
    if (typeof storage !== 'string' || !storage.trim()) {
      return null;
    }
    return toLocalPath(storage.trim(), exePath);
  } catch {
    return null;
  }
}

function defaultStorageDirectory(exePath: string): string | null {
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA;
    return localAppData ? path.join(localAppData, 'Helldivers2ModManager') : null;
  }

  const prefix = findWinePrefix(exePath);
  if (prefix) {
    const user = os.userInfo().username;
    return path.join(prefix, 'drive_c', 'users', user, 'AppData', 'Local', 'Helldivers2ModManager');
  }

  const dataHome = process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share');
  return path.join(dataHome, 'Helldivers2ModManager');
}

function modsDirectory(storage: string): string {
  const preferred = path.join(storage, 'Mods');
  if (fs.existsSync(preferred)) {
    return preferred;
  }
  const lower = path.join(storage, 'mods');
  return fs.existsSync(lower) ? lower : preferred;
}

function toLocalPath(storage: string, exePath: string): string | null {
  if (!isWindowsPath(storage)) {
    return path.resolve(storage);
  }
  if (process.platform === 'win32') {
    return path.win32.resolve(storage);
  }

  const prefix = findWinePrefix(exePath);
  if (!prefix) {
    return null;
  }
  return translateWindowsPath(storage, prefix);
}

function isWindowsPath(value: string): boolean {
  return /^[a-zA-Z]:[\\/]/.test(value);
}

function fileName(value: string): string {
  return isWindowsPath(value) ? path.win32.basename(value) : path.basename(value);
}

function translateWindowsPath(windowsPath: string, prefix: string): string | null {
  const match = /^([a-zA-Z]):[\\/](.*)$/.exec(windowsPath.trim());
  if (!match) {
    return null;
  }

  const drive = match[1].toLowerCase();
  const rest = match[2].replace(/[\\/]+/g, '/');
  const viaDosDevices = path.join(prefix, 'dosdevices', `${drive}:`, rest);
  if (fs.existsSync(viaDosDevices) || drive !== 'c') {
    return viaDosDevices;
  }
  return path.join(prefix, 'drive_c', rest);
}

function findWinePrefix(startPath: string): string | null {
  let current = path.resolve(startPath);
  const root = path.parse(current).root;

  while (current && current !== root) {
    if (fs.existsSync(path.join(current, 'dosdevices')) && fs.existsSync(path.join(current, 'drive_c'))) {
      return current;
    }
    if (path.basename(current) === 'drive_c') {
      return path.dirname(current);
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  return null;
}

function rankInstall(install: Hd2ModManagerInstall): number {
  let score = 0;
  if (install.settingsFile) {
    score += 4;
  }
  if (fs.existsSync(install.modsPath)) {
    score += 2;
  } else if (fs.existsSync(install.storageDirectory)) {
    score += 1;
  }
  return score;
}

async function findManagerExecutables(): Promise<string[]> {
  const found: string[] = [];
  const seen = new Set<string>();
  const remember = (exePath: string) => {
    if (!exePath || !fs.existsSync(exePath)) {
      return;
    }
    const key = normalizePath(exePath);
    if (seen.has(key) || found.length >= MAX_HITS) {
      return;
    }
    seen.add(key);
    found.push(exePath);
  };

  remember(await runningExecutablePath() ?? '');

  const queue: Array<{ dir: string; depth: number }> = [];
  const visited = new Set<string>();
  const enqueue = (dir: string, depth: number) => {
    const key = normalizePath(dir);
    if (visited.has(key)) {
      return;
    }
    visited.add(key);
    queue.push({ dir, depth });
  };

  for (const root of searchRoots()) {
    enqueue(root.dir, root.depth);
  }

  while (queue.length > 0 && found.length < MAX_HITS) {
    const batch = queue.splice(0, 32);
    await Promise.all(batch.map(async (item) => {
      let entries;
      try {
        entries = await readdir(item.dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          continue;
        }
        const fullPath = path.join(item.dir, entry.name);
        if (entry.isFile() && entry.name.toLowerCase() === EXE_NAME) {
          remember(fullPath);
          continue;
        }
        if (entry.isDirectory() && item.depth > 0 && !SKIP_DIRECTORIES.has(entry.name.toLowerCase())) {
          enqueue(fullPath, item.depth - 1);
        }
      }
    }));
  }

  return found;
}

function searchRoots(): Array<{ dir: string; depth: number }> {
  const home = os.homedir();
  const roots = [
    { dir: path.join(home, 'Desktop'), depth: 5 },
    { dir: path.join(home, 'Downloads'), depth: 4 },
    { dir: path.join(home, 'Documents'), depth: 5 },
    { dir: path.join(home, 'Games'), depth: 5 },
  ];

  if (process.platform === 'win32') {
    roots.push(...windowsSearchRoots());
  } else {
    roots.push(...linuxSearchRoots(home));
  }

  return roots.filter((root) => fs.existsSync(root.dir));
}

function windowsSearchRoots(): Array<{ dir: string; depth: number }> {
  const roots: Array<{ dir: string; depth: number }> = [];
  const localAppData = process.env.LOCALAPPDATA;
  const roamingAppData = process.env.APPDATA;
  const programFiles = process.env.ProgramFiles;
  const programFilesX86 = process.env['ProgramFiles(x86)'];
  if (localAppData) {
    roots.push({ dir: localAppData, depth: 3 });
  }
  if (roamingAppData) {
    roots.push({ dir: roamingAppData, depth: 3 });
  }
  if (programFiles) {
    roots.push({ dir: programFiles, depth: 4 });
  }
  if (programFilesX86) {
    roots.push({ dir: programFilesX86, depth: 4 });
  }

  const systemDrive = (process.env.SystemDrive || 'C:').toLowerCase();
  for (const letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
    const drive = `${letter}:`;
    const root = `${drive}\\`;
    if (!fs.existsSync(root)) {
      continue;
    }
    roots.push({ dir: root, depth: drive.toLowerCase() === systemDrive ? 2 : 4 });
  }
  return roots;
}

function linuxSearchRoots(home: string): Array<{ dir: string; depth: number }> {
  const roots = [
    { dir: home, depth: 3 },
    { dir: path.join(home, '.wine'), depth: 8 },
  ];

  const extras = [
    path.join(home, '.local', 'share', 'bottles', 'bottles'),
    path.join(home, '.var', 'app', 'com.usebottles.bottles', 'data', 'bottles', 'bottles'),
    ...steamCompatDataRoots(home),
  ];
  for (const dir of extras) {
    roots.push({ dir, depth: 8 });
  }
  return roots;
}

function steamCompatDataRoots(home: string): string[] {
  const libraries = [
    path.join(home, '.steam', 'steam'),
    path.join(home, '.steam', 'root'),
    path.join(home, '.local', 'share', 'Steam'),
    path.join(home, '.var', 'app', 'com.valvesoftware.Steam', 'data', 'Steam'),
    path.join(home, 'snap', 'steam', 'common', '.local', 'share', 'Steam'),
    path.join(home, '.steam', 'steam', 'steamapps', 'compatdata'),
  ];
  const compat = new Set<string>();

  for (const library of libraries) {
    const direct = library.endsWith(`${path.sep}compatdata`) ? library : path.join(library, 'steamapps', 'compatdata');
    if (fs.existsSync(direct)) {
      compat.add(direct);
    }
    const manifest = path.join(library, 'steamapps', 'libraryfolders.vdf');
    if (!fs.existsSync(manifest)) {
      continue;
    }
    let text = '';
    try {
      text = fs.readFileSync(manifest, 'utf8');
    } catch {
      continue;
    }
    for (const match of text.matchAll(/"path"\s+"([^"]+)"/g)) {
      const folder = path.join(match[1].replace(/\\\\/g, '\\'), 'steamapps', 'compatdata');
      if (fs.existsSync(folder)) {
        compat.add(folder);
      }
    }
  }

  return [...compat];
}

async function runningExecutablePath(): Promise<string | null> {
  if (process.platform === 'win32') {
    return windowsRunningExecutable();
  }
  return linuxRunningExecutable();
}

function windowsRunningExecutable(): Promise<string | null> {
  const script = [
    "(Get-CimInstance Win32_Process -Filter \"Name = 'Helldivers2ModManager.exe'\"",
    '| Select-Object -ExpandProperty ExecutablePath) -join [Environment]::NewLine',
  ].join(' ');

  return new Promise((resolve) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', script],
      { timeout: 4000, windowsHide: true },
      (error, stdout) => {
        if (error) {
          resolve(null);
          return;
        }
        const exePath = stdout.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? null;
        resolve(exePath);
      },
    );
  });
}

function linuxRunningExecutable(): string | null {
  let pids: string[];
  try {
    pids = fs.readdirSync('/proc').filter((name) => /^\d+$/.test(name));
  } catch {
    return null;
  }

  for (const pid of pids) {
    const exePath = exeFromProcess(pid);
    if (exePath) {
      return exePath;
    }
  }
  return null;
}

function exeFromProcess(pid: string): string | null {
  let parts: string[];
  try {
    parts = fs.readFileSync(path.join('/proc', pid, 'cmdline')).toString('utf8').split('\0').filter(Boolean);
  } catch {
    return null;
  }

  const argument = parts.find((part) => fileName(part).toLowerCase() === EXE_NAME);
  if (!argument) {
    return null;
  }
  if (!isWindowsPath(argument)) {
    return path.isAbsolute(argument) ? argument : null;
  }

  const prefix = winePrefixFromProcess(pid) ?? findWinePrefix(argument);
  return prefix ? translateWindowsPath(argument, prefix) : null;
}

function winePrefixFromProcess(pid: string): string | null {
  try {
    const raw = fs.readFileSync(path.join('/proc', pid, 'environ')).toString('utf8');
    for (const entry of raw.split('\0')) {
      if (entry.startsWith('WINEPREFIX=')) {
        const prefix = entry.slice('WINEPREFIX='.length);
        return prefix && fs.existsSync(prefix) ? prefix : null;
      }
    }
  } catch {
    return null;
  }
  return null;
}
