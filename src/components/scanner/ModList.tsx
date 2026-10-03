import { FileSearch, Folder } from 'lucide-react';
import { folderDisplayName, managedScanPath, readableInk, toModRelativePath, type ILuaFile, type IScanPath, type IScannedMod } from '../../../shared/types/scanner';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../ui/accordion';

interface ModListProps {
  mods: IScannedMod[];
  paths: IScanPath[];
  onOpenFolder: (folderPath: string) => void;
  onOpenFile: (filePath: string) => void;
}

export function ModList({
  mods,
  paths,
  onOpenFolder,
  onOpenFile,
}: ModListProps) {
  if (paths.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-base text-muted-foreground">Add a mods folder from settings.</p>
      </div>
    );
  }

  const groups = groupMods(paths, mods);

  return (
    <Accordion type="multiple" className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
      {groups.map((group) => (
        <div key={group.key} className="min-w-0">
          <div
            className="sticky top-0 z-10 flex items-center px-3 py-2"
            style={{ backgroundColor: group.color, color: readableInk(group.color) }}
          >
            <p className="min-w-0 flex-1 truncate text-sm font-medium" title={group.path}>
              {sectionName(group)}
            </p>
          </div>
          {group.mods.length === 0 ? (
            <p
              className={cn(
                'truncate border-l-[3px] px-3 py-3 text-sm',
                emptyFolderWarning(group) ? 'text-amber-300' : 'text-muted-foreground',
              )}
              style={{ borderLeftColor: group.color }}
              title={groupEmptyMessage(group)}
            >
              {groupEmptyMessage(group)}
            </p>
          ) : group.mods.map((mod) => (
        <AccordionItem
          key={mod.path}
          value={mod.path}
          className="min-w-0 border-l-[3px]"
          style={{ borderLeftColor: group.color }}
        >
          <div className="flex items-center pr-3">
            <AccordionTrigger className="min-w-0 px-3 hover:no-underline">
              <span className="min-w-0 flex-1 truncate">{mod.name}</span>
              <span className="text-sm text-muted-foreground">{mod.luaFiles.length}</span>
            </AccordionTrigger>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              title="Open mod folder"
              onClick={() => onOpenFolder(mod.path)}
            >
              <Folder className="size-5" />
            </Button>
          </div>
          <AccordionContent>
            {mod.luaFiles.map((file) => {
              const relativePath = luaDirectory(mod.path, file);
              return (
                <div key={file.path} className="flex items-center gap-2 py-1 pr-3 pl-8">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm" title={file.name}>{file.name}</p>
                    {relativePath && (
                      <button
                        type="button"
                        className="group flex min-w-0 max-w-full items-center gap-1 text-left text-xs text-muted-foreground"
                        title="Open folder"
                        onClick={() => onOpenFolder(parentDirectory(file.path))}
                      >
                        <Folder className="size-3.5 shrink-0" />
                        <span className="min-w-0 truncate group-hover:underline" title={relativePath}>.../{relativePath}</span>
                      </button>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title="Open Lua file"
                    onClick={() => onOpenFile(file.path)}
                  >
                    <FileSearch className="size-5" />
                  </Button>
                </div>
              );
            })}
          </AccordionContent>
        </AccordionItem>
          ))}
        </div>
      ))}
    </Accordion>
  );
}

function groupMods(paths: IScanPath[], mods: IScannedMod[]): ModGroup[] {
  const groups: ModGroup[] = paths.map((entry) => ({
    key: `path:${entry.id}`,
    source: entry.source,
    path: entry.path,
    label: entry.label,
    color: entry.color,
    exists: entry.exists,
    hasMods: entry.hasMods,
    mods: [],
  }));
  const byPath = new Map(groups.map((group) => [pathKey(group.path), group]));

  for (const mod of mods) {
    const storage = mod.storagePath || mod.path;
    const group = byPath.get(pathKey(storage));
    if (group) {
      group.mods.push(mod);
      continue;
    }

    const orphanKey = `orphan:${pathKey(storage)}`;
    let orphan = groups.find((item) => item.key === orphanKey);
    if (!orphan) {
      orphan = {
        key: orphanKey,
        source: mod.storageSource || 'custom',
        path: storage,
        label: '',
        color: '#71717A',
        exists: true,
        hasMods: true,
        mods: [],
      };
      groups.push(orphan);
    }
    orphan.mods.push(mod);
  }

  return groups;
}

interface ModGroup {
  key: string;
  source: IScannedMod['storageSource'];
  path: string;
  label: string;
  color: string;
  exists: boolean;
  hasMods: boolean;
  mods: IScannedMod[];
}

function sectionName(group: ModGroup): string {
  return managedScanPath(group.source)?.label ?? folderDisplayName(group.label, group.path);
}

function pathKey(value: string): string {
  return value.replace(/[\\/]+$/, '').split('\\').join('/').toLowerCase();
}

function emptyFolderWarning(group: ModGroup): boolean {
  return Boolean(managedScanPath(group.source)) && group.exists && !group.hasMods;
}

function groupEmptyMessage(group: ModGroup): string {
  if (!group.exists) {
    return 'This folder is missing.';
  }
  if (emptyFolderWarning(group)) {
    return 'This folder is empty. No mods were found.';
  }
  return 'No Lua scripts in this folder.';
}

function parentDirectory(filePath: string): string {
  const slash = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return slash === -1 ? filePath : filePath.slice(0, slash);
}

function luaDirectory(modPath: string, file: ILuaFile): string {
  const relative = file.relativePath || toModRelativePath(modPath, file.path);
  const slash = relative.lastIndexOf('/');
  if (slash === -1) {
    return relative.toLowerCase() === file.name.toLowerCase() ? '' : relative;
  }

  const tail = relative.slice(slash + 1);
  if (tail.toLowerCase() === file.name.toLowerCase()) {
    return relative.slice(0, slash);
  }

  return relative;
}

