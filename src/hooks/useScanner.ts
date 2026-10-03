import { useCallback, useEffect, useState } from 'react';
import type { IApiResponse } from '../../shared/types';
import type { IScannerState } from '../../shared/types/scanner';
import { scannerService } from '../services/ipc';

type LoadPhase = 'loading' | 'ready';

export function useScanner() {
  const [state, setState] = useState<IScannerState | null>(null);
  const [phase, setPhase] = useState<LoadPhase>('loading');
  const [status, setStatus] = useState('Starting');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const applyState = useCallback((next: IScannerState) => {
    setState(next);
    setError(null);
    setPhase('ready');
  }, []);

  const run = useCallback(async (
    action: () => Promise<IApiResponse<IScannerState | null>>,
  ) => {
    setBusy(true);
    setStatus('');
    setError(null);
    const response = await action();
    setBusy(false);

    if (!response.success) {
      setError(response.error ?? 'Request failed');
      setPhase('ready');
      return;
    }

    if (response.data) {
      applyState(response.data);
    }
  }, [applyState]);

  const bootstrap = useCallback(() => {
    setPhase('loading');
    setError(null);
    return run(() => scannerService.bootstrap());
  }, [run]);

  useEffect(() => {
    const unsubscribe = scannerService.onProgress(setStatus);
    void bootstrap();
    return unsubscribe;
  }, [bootstrap]);

  const refresh = useCallback(() => run(() => scannerService.refresh()), [run]);
  const addPath = useCallback(() => run(() => scannerService.addPath()), [run]);
  const updatePath = useCallback((id: number) => run(() => scannerService.updatePath(id)), [run]);
  const removePath = useCallback((id: number) => run(() => scannerService.removePath(id)), [run]);

  const setPathLabel = useCallback(async (id: number, label: string) => {
    const response = await scannerService.setPathLabel(id, label);
    if (!response.success) {
      setError(response.error ?? 'Unable to save the name');
      return;
    }
    if (response.data) {
      applyState(response.data);
    }
  }, [applyState]);

  const setPathColor = useCallback(async (id: number, color: string) => {
    const response = await scannerService.setPathColor(id, color);
    if (!response.success) {
      setError(response.error ?? 'Unable to save the color');
      return;
    }
    if (response.data) {
      applyState(response.data);
    }
  }, [applyState]);

  const setScanOnStartup = useCallback((enabled: boolean) => {
    return run(() => scannerService.setScanOnStartup(enabled));
  }, [run]);

  const setReportNexusLua = useCallback((enabled: boolean) => {
    return run(() => scannerService.setReportNexusLua(enabled));
  }, [run]);

  const hardReset = useCallback(async () => {
    const response = await scannerService.hardReset();
    if (!response.success) {
      const message = response.error ?? 'Unable to reset';
      setError(message);
      return message;
    }
    return null;
  }, []);

  const openPath = useCallback(async (targetPath: string) => {
    const response = await scannerService.openPath(targetPath);
    if (!response.success) {
      setError(response.error ?? 'Unable to open the path');
    }
  }, []);

  return {
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
  };
}
