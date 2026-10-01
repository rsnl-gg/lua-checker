import { logger, LogSource } from '../helpers';

const controllers: { unregister: () => void }[] = [];

export function registerAllControllers(): void {
  logger.info(LogSource.IPC, 'Registration', 'Registering all controllers...');

  // Register your controllers here:
  // const yourController = createYourEntityController();
  // yourController.register();
  // controllers.push(yourController);

  logger.info(LogSource.IPC, 'Registration', `Registered ${controllers.length} controller(s)`);
}

export function unregisterAllControllers(): void {
  for (const controller of controllers) {
    controller.unregister();
  }
  controllers.length = 0;
  logger.info(LogSource.IPC, 'Registration', 'All controllers unregistered');
}
