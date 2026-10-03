import { useEffect, useRef, useState } from 'react';
import { FolderCog, Plus, RefreshCw, SquarePen, Trash2 } from 'lucide-react';
import { managedScanPath, type IScanPath } from '../../../shared/types/scanner';
import arsenalBg from '../../assets/arsenal-bg.webp';
import { Button } from '../ui/button';
import { ColorPicker } from '../ui/color-picker';
import {
  Drawer,
  DrawerContent,
  DrawerBackdrop,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Switch } from '../ui/switch';

interface SettingsDrawerProps {
  open: boolean;
  reportNexusLua: boolean;
  scanOnStartup: boolean;
  paths: IScanPath[];
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onScanOnStartupChange: (enabled: boolean) => void;
  onReportChange: (enabled: boolean) => void;
  onAdd: () => void;
  onEdit: (id: number) => void;
  onLabelChange: (id: number, label: string) => void;
  onColorChange: (id: number, color: string) => void;
  onRemove: (id: number) => void;
  onRefresh: () => void;
  onHardReset: () => Promise<string | null>;
}

export function SettingsDrawer({
  open,
  reportNexusLua,
  scanOnStartup,
  paths,
  busy,
  onOpenChange,
  onScanOnStartupChange,
  onReportChange,
  onAdd,
  onEdit,
  onLabelChange,
  onColorChange,
  onRemove,
  onRefresh,
  onHardReset,
}: SettingsDrawerProps) {
  return (
    <Drawer direction="bottom" open={open} onOpenChange={onOpenChange} shouldScaleBackground={false}>
      <DrawerContent>
        <DrawerBackdrop src={arsenalBg} />
        <div className="relative z-10 flex flex-col">
        <DrawerHeader>
          <DrawerTitle>Settings</DrawerTitle>
        </DrawerHeader>

        <div className="flex items-start gap-3 px-4 py-3">
          <Switch
            checked={scanOnStartup}
            disabled={busy}
            onCheckedChange={onScanOnStartupChange}
            aria-label="Check Lua on startup"
          />
          <div className="min-w-0">
            <p className="text-base">Check Lua on startup</p>
            <p className="text-sm text-muted-foreground">
              Re-reads mod folders for Lua scripts every time the app opens. Turn this off to keep the last result until you refresh.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 px-4 py-3">
          <Switch
            checked={reportNexusLua}
            disabled={busy}
            onCheckedChange={onReportChange}
            aria-label="Report Nexus mods"
          />
          <div className="min-w-0">
            <p className="text-base">Report Nexus mods</p>
            <p className="text-sm text-muted-foreground">
              Sends mod id, file id, and whether a Lua script was found to the Arsenal servers. Only mods listed in Arsenal with both Nexus ids set are included.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 pt-1 pb-2">
          <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">Mod folders</p>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onAdd}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>

        <div className="max-h-56 overflow-x-hidden overflow-y-auto px-4">
          {paths.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No folders yet.</p>
          ) : (
            <ul>
              {paths.map((entry) => {
                const managed = managedScanPath(entry.source);
                return (
                <li key={entry.id} className="flex items-start gap-2 py-2">
                  <ColorPicker
                    value={entry.color}
                    disabled={busy}
                    onChange={(color) => onColorChange(entry.id, color)}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1.5">
                      {managed ? (
                        <p className="min-w-0 flex-1 truncate text-sm">{managed.label}</p>
                      ) : (
                        <FolderLabel
                          value={entry.label}
                          disabled={busy}
                          onCommit={(label) => onLabelChange(entry.id, label)}
                        />
                      )}
                      {!entry.exists && (
                        <span className="text-xs text-destructive">Missing</span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground" title={entry.path}>{entry.path}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title="Change folder"
                    disabled={busy}
                    onClick={() => onEdit(entry.id)}
                  >
                    <FolderCog className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    title={managed ? 'Found automatically' : 'Remove folder'}
                    disabled={busy || !!managed}
                    onClick={() => onRemove(entry.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
                );
              })}
            </ul>
          )}
        </div>

        <DrawerFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={onRefresh}>
            <RefreshCw className={busy ? 'size-4 animate-spin' : 'size-4'} />
            Refresh mods storage
          </Button>
          <div className="flex flex-col gap-2 pt-2">
            <p className="text-sm text-muted-foreground">
              Hold for 5 seconds to erase every Arsenal Lua Checker setting, then close the app.
            </p>
            <HardResetButton onReset={onHardReset} />
          </div>
        </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}

const HOLD_MS = 5000;

function HardResetButton({ onReset }: { onReset: () => Promise<string | null> }) {
  const [progress, setProgress] = useState(0);
  const [failure, setFailure] = useState<string | null>(null);
  const frameRef = useRef(0);
  const startRef = useRef(0);
  const doneRef = useRef(false);

  useEffect(() => {
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  const stop = () => {
    if (doneRef.current) {
      return;
    }
    cancelAnimationFrame(frameRef.current);
    setProgress(0);
  };

  const tick = () => {
    const next = Math.min((performance.now() - startRef.current) / HOLD_MS, 1);
    setProgress(next);
    if (next < 1) {
      frameRef.current = requestAnimationFrame(tick);
      return;
    }
    doneRef.current = true;
    void onReset().then((message) => {
      if (!message) {
        return;
      }
      doneRef.current = false;
      setProgress(0);
      setFailure(message);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        className="relative h-10 w-full touch-none overflow-hidden rounded-md bg-[#9B1C1C] text-sm font-medium text-white outline-none select-none focus:outline-none focus-visible:outline-none"
        onPointerDown={(event) => {
          if (event.button !== 0 || doneRef.current) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          setFailure(null);
          event.currentTarget.setPointerCapture(event.pointerId);
          startRef.current = performance.now();
          cancelAnimationFrame(frameRef.current);
          frameRef.current = requestAnimationFrame(tick);
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
      >
        <span
          aria-hidden
          className="absolute inset-y-0 left-0 bg-[#FF2D2D]"
          style={{ width: `${progress * 100}%` }}
        />
        <span className="relative">Hard reset</span>
      </button>
      {failure && <p className="truncate text-sm text-destructive" title={failure}>{failure}</p>}
    </div>
  );
}

function FolderLabel({
  value,
  disabled,
  onCommit,
}: {
  value: string;
  disabled: boolean;
  onCommit: (label: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const next = draft.replace(/\s+/g, ' ').trim();
    if (!next || next === value) {
      setDraft(value);
      return;
    }
    onCommit(next);
  };

  const cancel = () => {
    cancelRef.current = true;
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5">
      <button
        type="button"
        title="Rename"
        disabled={disabled}
        onMouseDown={(event) => {
          if (editing) {
            event.preventDefault();
          }
        }}
        onClick={() => {
          if (editing) {
            commit();
            return;
          }
          setEditing(true);
        }}
        className="relative z-10 flex size-5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        <SquarePen className="size-4" />
      </button>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          disabled={disabled}
          aria-label="Folder name"
          spellCheck={false}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            if (cancelRef.current) {
              cancelRef.current = false;
              return;
            }
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.currentTarget.blur();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              cancel();
            }
          }}
          className="min-w-0 flex-1 truncate border-0 bg-transparent p-0 text-sm text-foreground shadow-none ring-0 outline-none select-text focus:ring-0"
        />
      ) : (
        <p className="min-w-0 flex-1 truncate text-sm">{value}</p>
      )}
    </div>
  );
}

