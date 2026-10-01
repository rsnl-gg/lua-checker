import { app, BrowserWindow, nativeTheme } from 'electron';
import { getDatabase } from './database/Database';
import { getWindowManager } from './managers/WindowManager';
import { registerAllControllers } from './ipc';
import { logger, LogSource } from './helpers';

nativeTheme.themeSource = 'dark';

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const mainWindow = getWindowManager().getMainWindow();
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

async function initializeApp(): Promise<void> {
  try {
    logger.info(LogSource.APP, 'Main', 'Initializing database...');
    await getDatabase().initialize();

    logger.info(LogSource.APP, 'Main', 'Registering IPC controllers...');
    registerAllControllers();

    logger.info(LogSource.APP, 'Main', 'Creating main window...');
    getWindowManager().createMainWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      title: "Arsenal",
      resizable: true,
      frame: false,
      backgroundColor: '#141414',
    });

    logger.info(LogSource.APP, 'Main', 'Application initialized successfully');
  } catch (error) {
    logger.fatal(LogSource.APP, 'Main', 'Failed to initialize', error);
    app.quit();
  }
}

app.whenReady().then(initializeApp);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    getWindowManager().createMainWindow();
  }
});

app.on('before-quit', async () => {
  logger.info(LogSource.APP, 'Main', 'Closing database...');
  await getDatabase().close();
});

process.on('uncaughtException', (error) => {
  logger.fatal(LogSource.APP, 'Main', 'Uncaught exception', error);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.fatal(LogSource.APP, 'Main', 'Unhandled rejection', { promise, reason });
});
