import { logger, LogSource } from '../helpers';
import { createScannerController } from '../controllers/ScannerController';

const controllers: { unregister: () => void }[] = [];

export function registerAllControllers(): void {
  logger.info(LogSource.IPC, 'Registration', 'Registering all controllers...');

  const scannerController = createScannerController();
  scannerController.register();
  controllers.push(scannerController);

  logger.info(LogSource.IPC, 'Registration', `Registered ${controllers.length} controller(s)`);
}

export function unregisterAllControllers(): void {
  for (const controller of controllers) {
    controller.unregister();
  }
  controllers.length = 0;
  logger.info(LogSource.IPC, 'Registration', 'All controllers unregistered');
}
