import { dialog, shell } from 'electron';
import fs from 'node:fs';
import type { IApiResponse } from '../../../shared/types';
import { arsenalDownloadUrl, type IScannedMod, type IScannerState, type ISystemInfo } from '../../../shared/types/scanner';
import { logger, LogSource } from '../helpers';
import { getWindowManager } from '../managers/WindowManager';
import { getScanPathRepository } from '../repositories/ScanPathRepository';
import { getSettingsRepository } from '../repositories/SettingsRepository';
import { normalizePath, readArsenalInstall, type ArsenalInstall } from '../scanner/arsenalInstall';
import { readHd2ModManagerInstall } from '../scanner/hd2ModManager';
import { scanModsRoot, type ScannedModHit } from '../scanner/luaModScanner';
import { NexusLuaReporter } from '../scanner/nexusLuaReporter';
import { detectPlatform } from '../scanner/platform';
import { readSystemInfo } from '../scanner/systemInfo';
import { hardResetApp } from '../resetAppData';

type ProgressListener = (message: string) => void;

export class ScannerService {
  private static instance: ScannerService;
  private readonly reporter = new NexusLuaReporter();
  private arsenalInstalled = false;
  private mods: IScannerState['mods'] = [];
  private scannedCount = 0;

  public static getInstance(): ScannerService {
    if (!ScannerService.instance) {
      ScannerService.instance = new ScannerService();
    }
    return ScannerService.instance;
  }

  async bootstrap(onProgress: ProgressListener): Promise<IApiResponse<IScannerState>> {
    try {
      onProgress('Checking the operating system');
      onProgress('Looking for HD2 Arsenal');
      this.syncArsenalPath();
      await this.syncHd2ModManagerPath(onProgress);
      const settings = getSettingsRepository();
      if (!settings.getScanOnStartup() && settings.getLastScan()) {
        this.restoreLastScan();
        return this.success(this.snapshot());
      }
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async refresh(onProgress: ProgressListener): Promise<IApiResponse<IScannerState>> {
    try {
      onProgress('Looking for HD2 Arsenal');
      this.syncArsenalPath();
      await this.syncHd2ModManagerPath(onProgress);
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async setPathLabel(id: number, label: string): Promise<IApiResponse<IScannerState>> {
    try {
      getScanPathRepository().updateLabel(id, label);
      return this.success(this.snapshot());
    } catch (error) {
      return this.failure(error);
    }
  }

  async setPathColor(id: number, color: string): Promise<IApiResponse<IScannerState>> {
    try {
      getScanPathRepository().updateColor(id, color);
      return this.success(this.snapshot());
    } catch (error) {
      return this.failure(error);
    }
  }

  async setScanOnStartup(enabled: boolean): Promise<IApiResponse<IScannerState>> {
    try {
      getSettingsRepository().setScanOnStartup(enabled);
      return this.success(this.snapshot());
    } catch (error) {
      return this.failure(error);
    }
  }

  async setReportNexusLua(enabled: boolean, onProgress: ProgressListener): Promise<IApiResponse<IScannerState>> {
    try {
      getSettingsRepository().setReportNexusLua(enabled);
      if (!enabled) {
        return this.success(this.snapshot());
      }
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async addPathFromDialog(onProgress: ProgressListener): Promise<IApiResponse<IScannerState | null>> {
    try {
      const selected = await this.pickDirectory();
      if (!selected) {
        return this.success(null);
      }
      this.assertDirectory(selected);
      getScanPathRepository().addCustom(selected);
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async updatePathFromDialog(id: number, onProgress: ProgressListener): Promise<IApiResponse<IScannerState | null>> {
    try {
      const selected = await this.pickDirectory();
      if (!selected) {
        return this.success(null);
      }
      this.assertDirectory(selected);
      getScanPathRepository().updatePath(id, selected);
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async removePath(id: number, onProgress: ProgressListener): Promise<IApiResponse<IScannerState>> {
    try {
      getScanPathRepository().remove(id);
      return await this.scan(onProgress);
    } catch (error) {
      return this.failure(error);
    }
  }

  async getSystemInfo(): Promise<IApiResponse<ISystemInfo>> {
    try {
      return this.success(readSystemInfo());
    } catch (error) {
      return this.failure(error);
    }
  }

  async openPath(targetPath: string): Promise<IApiResponse<boolean>> {
    try {
      if (!targetPath || !fs.existsSync(targetPath)) {
        return this.failure(new Error('Path not found'));
      }
      const openError = await shell.openPath(targetPath);
      if (openError) {
        return this.failure(new Error(openError));
      }
      return this.success(true);
    } catch (error) {
      return this.failure(error);
    }
  }

  async hardReset(): Promise<IApiResponse<boolean>> {
    try {
      hardResetApp();
      return this.success(true);
    } catch (error) {
      return this.failure(error);
    }
  }

  async openArsenalDownload(): Promise<IApiResponse<boolean>> {
    try {
      await shell.openExternal(arsenalDownloadUrl(detectPlatform()));
      return this.success(true);
    } catch (error) {
      return this.failure(error);
    }
  }

  private syncArsenalPath(): ArsenalInstall | null {
    const install = readArsenalInstall();
    this.arsenalInstalled = install !== null;
    if (install?.modsPath) {
      getScanPathRepository().syncArsenalPath(install.modsPath);
    }
    return install;
  }

  private async syncHd2ModManagerPath(onProgress: ProgressListener): Promise<void> {
    if (getScanPathRepository().hasSource('hd2mm')) {
      return;
    }

    onProgress('Looking for Helldivers 2 Mod Manager');
    const install = await readHd2ModManagerInstall();
    if (install?.modsPath) {
      getScanPathRepository().syncHd2ModManagerPath(install.modsPath);
    }
  }

  private async scan(onProgress: ProgressListener): Promise<IApiResponse<IScannerState>> {
    const install = readArsenalInstall();
    this.arsenalInstalled = install !== null;
    const reportEnabled = getSettingsRepository().getReportNexusLua();
    const paths = getScanPathRepository().findAll();
    const hits: ScannedModHit[] = [];

    for (const entry of paths) {
      if (!entry.exists) {
        continue;
      }

      onProgress(`Scanning ${entry.path}`);
      try {
        const found = await scanModsRoot(entry.path, entry.source, install?.modsByPath ?? new Map(), (name) => {
          onProgress(`Scanning ${name}`);
        });
        hits.push(...found);
      } catch (error) {
        logger.warn(LogSource.SERVICE, 'ScannerService', `Skipped ${entry.path}`, error);
      }
    }

    const uniqueHits = dedupeHits(hits);

    if (reportEnabled) {
      for (const hit of uniqueHits) {
        if (hit.modId !== null && hit.fileId !== null) {
          this.reporter.report(hit.modId, hit.fileId, hit.hasLua);
        }
      }
    }

    const mods = uniqueHits
      .filter((hit) => hit.luaFiles.length > 0)
      .sort((left, right) => left.name.localeCompare(right.name));

    this.mods = mods;
    this.scannedCount = uniqueHits.length;
    getSettingsRepository().setLastScan({ mods, scannedCount: uniqueHits.length });
    return this.success(this.snapshot());
  }

  private restoreLastScan(): void {
    const stored = getSettingsRepository().getLastScan();
    this.mods = this.withStorage(stored?.mods ?? []);
    this.scannedCount = stored?.scannedCount ?? 0;
  }

  private withStorage(mods: IScannedMod[]): IScannedMod[] {
    const paths = getScanPathRepository().findAll()
      .slice()
      .sort((left, right) => right.path.length - left.path.length);

    return mods.map((mod) => {
      if (mod.storagePath && mod.storageSource) {
        return mod;
      }

      const match = paths.find((entry) => pathIsInside(mod.path, entry.path));
      return {
        ...mod,
        storagePath: match?.path ?? mod.storagePath ?? '',
        storageSource: match?.source ?? mod.storageSource ?? 'custom',
      };
    });
  }

  private snapshot(): IScannerState {
    return {
      platform: detectPlatform(),
      arsenalInstalled: this.arsenalInstalled,
      reportNexusLua: getSettingsRepository().getReportNexusLua(),
      scanOnStartup: getSettingsRepository().getScanOnStartup(),
      paths: getScanPathRepository().findAll(),
      mods: this.withStorage(this.mods),
      scannedCount: this.scannedCount,
    };
  }

  private async pickDirectory(): Promise<string | null> {
    const parent = getWindowManager().getMainWindow();
    const options: Electron.OpenDialogOptions = { properties: ['openDirectory'] };
    const result = parent
      ? await dialog.showOpenDialog(parent, options)
      : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  }

  private assertDirectory(folderPath: string): void {
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      throw new Error('Choose an existing folder');
    }
  }

  private success<T>(data: T): IApiResponse<T> {
    return { success: true, data };
  }

  private failure<T>(error: unknown): IApiResponse<T> {
    const message = error instanceof Error ? error.message : 'Unexpected error';
    logger.error(LogSource.SERVICE, 'ScannerService', message, error);
    return { success: false, error: message };
  }
}

export const getScannerService = () => ScannerService.getInstance();

function pathIsInside(child: string, parent: string): boolean {
  const childKey = normalizePath(child);
  const parentKey = normalizePath(parent).replace(/[\\/]+$/, '');
  const separator = parentKey.includes('\\') ? '\\' : '/';
  return childKey === parentKey || childKey.startsWith(`${parentKey}${separator}`);
}

function dedupeHits(hits: ScannedModHit[]): ScannedModHit[] {
  const byPath = new Map<string, ScannedModHit>();
  for (const hit of hits) {
    const key = normalizePath(hit.path);
    const existing = byPath.get(key);
    if (!existing || hit.luaFiles.length > existing.luaFiles.length) {
      byPath.set(key, hit);
    }
  }
  return [...byPath.values()];
}
