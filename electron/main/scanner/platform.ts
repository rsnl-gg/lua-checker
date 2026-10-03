import os from 'node:os';
import type { AppPlatform } from '../../../shared/types/scanner';

export function detectPlatform(): AppPlatform {
  if (process.platform === 'win32') {
    return 'Windows';
  }

  if (os.release().toLowerCase().includes('valve')) {
    return 'Steamdeck';
  }

  return 'Linux';
}
