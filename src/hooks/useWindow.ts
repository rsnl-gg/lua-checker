import { useCallback, useState, useEffect } from 'react';
import { windowService } from '../services/ipc';

interface UseWindowReturn {
  minimize: () => Promise<void>;
  maximize: () => Promise<void>;
  close: () => Promise<void>;
  isMaximized: boolean;
  maximizable: boolean | null;
}

export function useWindow(): UseWindowReturn {
  const [isMaximized, setIsMaximized] = useState<boolean>(false);
  const [maximizable, setMaximizable] = useState<boolean | null>(null);

  const minimize = useCallback(async () => {
    await windowService.minimize();
  }, []);

  const maximize = useCallback(async () => {
    await windowService.maximize();
  }, []);

  const close = useCallback(async () => {
    await windowService.close();
  }, []);

  useEffect(() => {
    windowService.getIsMaximized().then((response) => {
      if (response.success && response.data !== undefined) {
        setIsMaximized(response.data);
      }
    });

    windowService.getMaximizable().then((response) => {
      if (response.success && response.data !== undefined) {
        setMaximizable(response.data);
      }
    });

    const unsubscribe = windowService.onMaximizeChange((maximized) => {
      setIsMaximized(maximized);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    minimize,
    maximize,
    close,
    isMaximized,
    maximizable,
  };
}
