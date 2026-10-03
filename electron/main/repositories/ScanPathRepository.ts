import fs from 'node:fs';
import path from 'node:path';
import {
  SCAN_PATH_COLORS,
  folderDisplayName,
  managedScanPath,
  normalizeFolderLabel,
  normalizeHexColor,
  parseScanPathSource,
  type IScanPath,
  type ScanPathSource,
} from '../../../shared/types/scanner';
import { getDatabase } from '../database/Database';
import { normalizePath } from '../scanner/arsenalInstall';

interface ScanPathRow {
  id: number;
  path: string;
  source: string;
  color: string | null;
  label: string | null;
}

export class ScanPathRepository {
  private static instance: ScanPathRepository;

  public static getInstance(): ScanPathRepository {
    if (!ScanPathRepository.instance) {
      ScanPathRepository.instance = new ScanPathRepository();
    }
    return ScanPathRepository.instance;
  }

  findAll(): IScanPath[] {
    const statement = getDatabase().getConnection().prepare(
      `SELECT id, path, source, color, label
       FROM scan_paths
       ORDER BY CASE source WHEN 'arsenal' THEN 0 WHEN 'hd2mm' THEN 1 ELSE 2 END, path COLLATE NOCASE`,
    );

    const rows: ScanPathRow[] = [];
    try {
      while (statement.step()) {
        rows.push(statement.getAsObject() as unknown as ScanPathRow);
      }
    } finally {
      statement.free();
    }

    const used = new Set(
      rows.flatMap((row) => {
        const color = normalizeHexColor(row.color);
        return color ? [color] : [];
      }),
    );
    let dirty = false;

    const paths = rows.map((row) => {
      const source = parseScanPathSource(row.source);
      const managed = managedScanPath(source);
      const folderPath = String(row.path);
      let label = typeof row.label === 'string' ? normalizeFolderLabel(row.label) : '';
      if (managed && label !== managed.label) {
        label = managed.label;
        this.writeLabel(Number(row.id), label, false);
        dirty = true;
      } else if (!managed && !label) {
        label = folderDisplayName('', folderPath);
        this.writeLabel(Number(row.id), label, false);
        dirty = true;
      }
      let color = normalizeHexColor(row.color);
      const arsenalNeedsBrandColor = source === 'arsenal' && color === '#F5C518';
      if (!color || arsenalNeedsBrandColor) {
        color = managed?.color ?? nextPathColor(used);
        used.add(color);
        this.writeColor(Number(row.id), color, false);
        dirty = true;
      }

      const exists = fs.existsSync(folderPath);
      return {
        id: Number(row.id),
        path: folderPath,
        source,
        label,
        color,
        exists,
        hasMods: exists && folderHasMods(folderPath),
      };
    });

    if (dirty) {
      getDatabase().save();
    }

    return paths;
  }

  findById(id: number): IScanPath | null {
    return this.findAll().find((entry) => entry.id === id) ?? null;
  }

  hasSource(source: ScanPathSource): boolean {
    const statement = getDatabase().getConnection().prepare(
      'SELECT 1 FROM scan_paths WHERE source = ? LIMIT 1',
    );
    try {
      statement.bind([source]);
      return statement.step();
    } finally {
      statement.free();
    }
  }

  addCustom(folderPath: string): IScanPath {
    const resolved = path.resolve(folderPath);
    const existing = this.findByNormalizedPath(resolved);
    if (existing) {
      throw new Error('That folder is already in the list');
    }

    const now = new Date().toISOString();
    const db = getDatabase().getConnection();
    db.run(
      `INSERT INTO scan_paths (path, source, label, created_at, updated_at) VALUES (?, 'custom', ?, ?, ?)`,
      [resolved, folderDisplayName('', resolved), now, now],
    );
    getDatabase().save();
    const created = this.findByNormalizedPath(resolved);
    if (!created) {
      throw new Error('Failed to save the folder');
    }
    return created;
  }

  updatePath(id: number, folderPath: string): IScanPath {
    const current = this.findById(id);
    if (!current) {
      throw new Error('Folder not found');
    }

    const resolved = path.resolve(folderPath);
    const duplicate = this.findByNormalizedPath(resolved);
    if (duplicate && duplicate.id !== id) {
      throw new Error('That folder is already in the list');
    }

    getDatabase().getConnection().run(
      'UPDATE scan_paths SET path = ?, updated_at = ? WHERE id = ?',
      [resolved, new Date().toISOString(), id],
    );
    getDatabase().save();

    const updated = this.findById(id);
    if (!updated) {
      throw new Error('Failed to update the folder');
    }
    return updated;
  }

  updateLabel(id: number, label: string): IScanPath {
    const current = this.findById(id);
    if (!current) {
      throw new Error('Folder not found');
    }
    if (current.source !== 'custom') {
      throw new Error('Only custom folders can be renamed');
    }

    const normalized = normalizeFolderLabel(label) || folderDisplayName('', current.path);
    this.writeLabel(id, normalized, true);
    getDatabase().save();

    const updated = this.findById(id);
    if (!updated) {
      throw new Error('Failed to update the name');
    }
    return updated;
  }

  updateColor(id: number, color: string): IScanPath {
    const current = this.findById(id);
    if (!current) {
      throw new Error('Folder not found');
    }

    const normalized = normalizeHexColor(color);
    if (!normalized) {
      throw new Error('Choose a hex color');
    }

    this.writeColor(id, normalized, true);
    getDatabase().save();

    const updated = this.findById(id);
    if (!updated) {
      throw new Error('Failed to update the color');
    }
    return updated;
  }

  remove(id: number): void {
    const current = this.findById(id);
    if (!current) {
      throw new Error('Folder not found');
    }
    if (managedScanPath(current.source)) {
      throw new Error('This folder is found automatically and cannot be removed');
    }

    this.deleteRow(id);
  }

  syncArsenalPath(folderPath: string): void {
    this.syncManagedPath('arsenal', folderPath);
  }

  syncHd2ModManagerPath(folderPath: string): void {
    this.syncManagedPath('hd2mm', folderPath);
  }

  private syncManagedPath(source: Exclude<ScanPathSource, 'custom'>, folderPath: string): void {
    const managed = managedScanPath(source);
    if (!managed) {
      return;
    }

    const resolved = path.resolve(folderPath);
    const owned = this.findAll().filter((entry) => entry.source === source);
    const samePath = this.findByNormalizedPath(resolved);

    if (samePath && samePath.source !== 'custom' && samePath.source !== source) {
      return;
    }

    if (samePath) {
      if (samePath.source !== source) {
        this.setSource(samePath.id, source);
        this.writeLabel(samePath.id, managed.label, false);
      }
      for (const row of owned) {
        if (row.id !== samePath.id) {
          this.deleteRow(row.id);
        }
      }
      getDatabase().save();
      return;
    }

    if (owned[0]) {
      this.updatePath(owned[0].id, resolved);
      this.setSource(owned[0].id, source);
      this.writeLabel(owned[0].id, managed.label, false);
      for (const row of owned.slice(1)) {
        this.deleteRow(row.id);
      }
      getDatabase().save();
      return;
    }

    const now = new Date().toISOString();
    getDatabase().getConnection().run(
      `INSERT INTO scan_paths (path, source, label, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`,
      [resolved, source, managed.label, now, now],
    );
    getDatabase().save();
  }

  private deleteRow(id: number): void {
    getDatabase().getConnection().run('DELETE FROM scan_paths WHERE id = ?', [id]);
    getDatabase().save();
  }

  private setSource(id: number, source: ScanPathSource): void {
    getDatabase().getConnection().run(
      'UPDATE scan_paths SET source = ?, updated_at = ? WHERE id = ?',
      [source, new Date().toISOString(), id],
    );
    getDatabase().save();
  }

  private findByNormalizedPath(folderPath: string): IScanPath | null {
    const key = normalizePath(folderPath);
    return this.findAll().find((entry) => normalizePath(entry.path) === key) ?? null;
  }

  private writeLabel(id: number, label: string, touchUpdatedAt: boolean): void {
    if (touchUpdatedAt) {
      getDatabase().getConnection().run(
        'UPDATE scan_paths SET label = ?, updated_at = ? WHERE id = ?',
        [label, new Date().toISOString(), id],
      );
      return;
    }

    getDatabase().getConnection().run(
      'UPDATE scan_paths SET label = ? WHERE id = ?',
      [label, id],
    );
  }

  private writeColor(id: number, color: string, touchUpdatedAt: boolean): void {
    if (touchUpdatedAt) {
      getDatabase().getConnection().run(
        'UPDATE scan_paths SET color = ?, updated_at = ? WHERE id = ?',
        [color, new Date().toISOString(), id],
      );
      return;
    }

    getDatabase().getConnection().run(
      'UPDATE scan_paths SET color = ? WHERE id = ?',
      [color, id],
    );
  }
}

function folderHasMods(folderPath: string): boolean {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(folderPath, { withFileTypes: true });
  } catch {
    return false;
  }

  return entries.some((entry) => {
    if (entry.name.startsWith('.')) {
      return false;
    }
    return entry.isDirectory() || (entry.isFile() && /\.patch_\d+$/i.test(entry.name));
  });
}

function nextPathColor(used: Set<string>): string {
  return SCAN_PATH_COLORS.find((color) => !used.has(color)) ?? SCAN_PATH_COLORS[used.size % SCAN_PATH_COLORS.length];
}

export const getScanPathRepository = () => ScanPathRepository.getInstance();
