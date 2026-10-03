import { app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { getDatabase } from './database/Database';
import { getWindowStateHelper } from './helpers';

export function hardResetApp(): void {
  getDatabase().discard();
  getWindowStateHelper().disablePersistence();

  const userData = app.getPath('userData');
  for (const name of fs.readdirSync(userData)) {
    try {
      fs.rmSync(path.join(userData, name), { recursive: true, force: true });
    } catch {
      // Chromium may still hold a lock on a cache file. App data is already discarded.
    }
  }

  setImmediate(() => {
    app.exit(0);
  });
}
