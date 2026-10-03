import os from 'node:os';
import { app } from 'electron';
import type { ISystemInfo } from '../../../shared/types/scanner';
import { readArsenalInstall } from './arsenalInstall';
import { detectPlatform } from './platform';

export function readSystemInfo(): ISystemInfo {
  const install = readArsenalInstall();
  return {
    platform: detectPlatform(),
    osVersion: os.version(),
    arch: os.arch(),
    appVersion: app.getVersion(),
    arsenalInstalled: install !== null,
    arsenalVersion: install?.version ?? null,
  };
}
