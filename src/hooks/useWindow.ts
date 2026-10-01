import { useCallback, useState, useEffect } from 'react';
import { windowService } from '../services/ipc';

interface UseWindowReturn {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  toggleFullscreen: () => Promise<void>;
  isMaximized: boolean;
  appVersion: string | null;
  quit: () => Promise<void>;
}

export function useWindow(): UseWindowReturn {
  const [appVersion, setAppVersion] = useState<string | null>(null);
  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  const minimize = useCallback(async () => {
    await windowService.minimize();
  }, []);

  const maximize = useCallback(async () => {
    await windowService.maximize();
  }, []);

  const close = useCallback(async () => {
    await windowService.close();
  }, []);

  const toggleFullscreen = useCallback(async () => {
    await windowService.toggleFullscreen();
  }, []);

  const quit = useCallback(async () => {
    await windowService.quitApp();
  }, []);

  useEffect(() => {
    windowService.getIsMaximized().then((response) => {
      if (response.success && response.data !== undefined) {
        setIsMaximized(response.data);
      }
    });

    const unsubscribe = windowService.onMaximizeChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Get app version
  useEffect(() => {
    windowService.getAppVersion().then((response) => {
      if (response.success && response.data) {
        setAppVersion(response.data);
      }
    });
  }, []);

  return {
    minimize,
    maximize,
    close,
    toggleFullscreen,
    isMaximized,
    appVersion,
    quit,
  };
}
