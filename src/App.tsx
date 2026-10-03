import { RefreshCw, Settings } from 'lucide-react';
import { TitleBar } from './components';
import { LoadingScreen } from './components/scanner/LoadingScreen';
import { ModList } from './components/scanner/ModList';
import { SettingsDrawer } from './components/scanner/SettingsDrawer';
import { Button } from './components/ui/button';
import { useState } from 'react';
import { useScanner } from './hooks/useScanner';
import { SystemInfoDrawer } from './components/scanner/SystemInfoDrawer';

function App() {
  const [infoOpen, setInfoOpen] = useState(false);
  const {
    state,
    phase,
    status,
    error,
    busy,
    settingsOpen,
    setSettingsOpen,
    bootstrap,
    refresh,
    addPath,
    updatePath,
    setPathLabel,
    setPathColor,
    removePath,
    setScanOnStartup,
    setReportNexusLua,
    hardReset,
    openPath,
  } = useScanner();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TitleBar
        title="ARSENAL - LUA CHECKER"
        onInfoClick={() => {
          setSettingsOpen(false);
          setInfoOpen(true);
        }}
      />

      {phase === 'loading' ? (
        <LoadingScreen status={status} />
      ) : (
        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
          <div className="flex h-12 items-center justify-between px-3">
            <span
              className="min-w-0 flex-1 truncate pr-3 text-sm text-muted-foreground"
              title={busy && status ? status : undefined}
            >
              {busy && status
                ? status
                : state
                  ? `${state.mods.length} Lua mod${state.mods.length === 1 ? '' : 's'}`
                  : 'Lua mods'}
            </span>
            <div className="flex shrink-0 items-center">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Refresh"
                disabled={busy}
                onClick={() => void refresh()}
              >
                <RefreshCw className={busy ? 'size-5 animate-spin' : 'size-5'} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title="Settings"
                onClick={() => {
                  setInfoOpen(false);
                  setSettingsOpen(true);
                }}
              >
                <Settings className="size-5" />
              </Button>
            </div>
          </div>

          {error && (
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <p className="min-w-0 flex-1 truncate text-sm text-destructive" title={error}>{error}</p>
              {!state && (
                <Button type="button" variant="ghost" size="sm" onClick={() => void bootstrap()}>
                  Retry
                </Button>
              )}
            </div>
          )}

          <ModList
            mods={state?.mods ?? []}
            paths={state?.paths ?? []}
            onOpenFolder={(folderPath) => void openPath(folderPath)}
            onOpenFile={(filePath) => void openPath(filePath)}
          />

          <SettingsDrawer
            open={settingsOpen}
            reportNexusLua={state?.reportNexusLua ?? true}
            scanOnStartup={state?.scanOnStartup ?? false}
            paths={state?.paths ?? []}
            busy={busy}
            onOpenChange={setSettingsOpen}
            onScanOnStartupChange={(enabled) => void setScanOnStartup(enabled)}
            onReportChange={(enabled) => void setReportNexusLua(enabled)}
            onAdd={() => void addPath()}
            onEdit={(id) => void updatePath(id)}
            onLabelChange={(id, label) => void setPathLabel(id, label)}
            onColorChange={(id, color) => void setPathColor(id, color)}
            onRemove={(id) => void removePath(id)}
            onRefresh={() => void refresh()}
            onHardReset={hardReset}
          />
        </main>
      )}

      <SystemInfoDrawer open={infoOpen} onOpenChange={setInfoOpen} />
    </div>
  );
}

export default App;
