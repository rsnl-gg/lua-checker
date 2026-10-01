import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { BaseHelper } from './BaseHelper';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

export enum LogSource {
  CONTROLLER = 'Controller',
  SERVICE = 'Service',
  REPOSITORY = 'Repository',
  MANAGER = 'Manager',
  HELPER = 'Helper',
  DATABASE = 'Database',
  IPC = 'IPC',
  APP = 'App',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  context: string;
  message: string;
  data?: unknown;
}

class LoggerHelper extends BaseHelper {
  private static instance: LoggerHelper;
  private logsDir: string;
  private currentLogFile: string;
  private logToConsole: boolean = true;
  private logToFile: boolean = true;
  private minLevel: LogLevel = LogLevel.DEBUG;

  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4,
  };

  private readonly levelColors: Record<LogLevel, string> = {
    [LogLevel.DEBUG]: '\x1b[36m', 
    [LogLevel.INFO]: '\x1b[32m',  
    [LogLevel.WARN]: '\x1b[33m',
    [LogLevel.ERROR]: '\x1b[31m',
    [LogLevel.FATAL]: '\x1b[35m',
  };

  private readonly resetColor = '\x1b[0m';

  private constructor() {
    super('LoggerHelper');
    this.logsDir = path.join(app.getPath('userData'), 'logs');
    this.ensureLogsDirectory();
    this.currentLogFile = this.getLogFileName();
  }

  public static getInstance(): LoggerHelper {
    if (!LoggerHelper.instance) {
      LoggerHelper.instance = new LoggerHelper();
    }
    return LoggerHelper.instance;
  }

  private ensureLogsDirectory(): void {
    if (!fs.existsSync(this.logsDir)) {
      fs.mkdirSync(this.logsDir, { recursive: true });
    }
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logsDir, `rsnl-desktop-${date}.log`);
  }

  private formatTimestamp(): string {
    return new Date().toISOString();
  }

  private formatLogEntry(entry: LogEntry): string {
    const { timestamp, level, source, context, message, data } = entry;
    let formatted = `[${timestamp}] [${level}] [${source}:${context}] ${message}`;
    
    if (data !== undefined) {
      try {
        const dataStr = typeof data === 'object' 
          ? JSON.stringify(data, null, 2) 
          : String(data);
        formatted += `\n  Data: ${dataStr}`;
      } catch {
        formatted += `\n  Data: [Unserializable]`;
      }
    }
    
    return formatted;
  }

  private formatConsoleLog(entry: LogEntry): string {
    const { timestamp, level, source, context, message } = entry;
    const time = timestamp.split('T')[1].split('.')[0];
    const color = this.levelColors[level];
    
    return `${color}[${time}]${this.resetColor} ${color}[${level}]${this.resetColor} [${source}:${context}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.levelPriority[this.minLevel];
  }

  private writeToFile(formattedLog: string): void {
    if (!this.logToFile) return;

    const expectedFile = this.getLogFileName();
    if (expectedFile !== this.currentLogFile) {
      this.currentLogFile = expectedFile;
    }

    try {
      fs.appendFileSync(this.currentLogFile, formattedLog + '\n', 'utf8');
    } catch (err) {
      console.error('Failed to write to log file:', err);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.logToConsole) return;

    const formatted = this.formatConsoleLog(entry);
    
    switch (entry.level) {
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(formatted, entry.data !== undefined ? entry.data : '');
        break;
      case LogLevel.WARN:
        console.warn(formatted, entry.data !== undefined ? entry.data : '');
        break;
      default:
        console.log(formatted, entry.data !== undefined ? entry.data : '');
    }
  }

  public log(
    level: LogLevel,
    source: LogSource,
    context: string,
    message: string,
    data?: unknown
  ): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: this.formatTimestamp(),
      level,
      source,
      context,
      message,
      data,
    };

    this.writeToConsole(entry);
    this.writeToFile(this.formatLogEntry(entry));
  }

  public debug(source: LogSource, context: string, message: string, data?: unknown): void {
    this.log(LogLevel.DEBUG, source, context, message, data);
  }

  public info(source: LogSource, context: string, message: string, data?: unknown): void {
    this.log(LogLevel.INFO, source, context, message, data);
  }

  public warn(source: LogSource, context: string, message: string, data?: unknown): void {
    this.log(LogLevel.WARN, source, context, message, data);
  }

  public error(source: LogSource, context: string, message: string, data?: unknown): void {
    this.log(LogLevel.ERROR, source, context, message, data);
  }

  public fatal(source: LogSource, context: string, message: string, data?: unknown): void {
    this.log(LogLevel.FATAL, source, context, message, data);
  }

  // Configuration methods
  public setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  public enableConsoleLogging(enable: boolean): void {
    this.logToConsole = enable;
  }

  public enableFileLogging(enable: boolean): void {
    this.logToFile = enable;
  }

  public getLogsDirectory(): string {
    return this.logsDir;
  }

  public async getLogFiles(): Promise<string[]> {
    try {
      const files = fs.readdirSync(this.logsDir);
      return files.filter(f => f.endsWith('.log')).sort().reverse();
    } catch {
      return [];
    }
  }

  public async readLogFile(filename: string): Promise<string | null> {
    try {
      const filePath = path.join(this.logsDir, filename);
      if (!fs.existsSync(filePath)) return null;
      return fs.readFileSync(filePath, 'utf8');
    } catch {
      return null;
    }
  }

  public async clearOldLogs(daysToKeep: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    
    let deletedCount = 0;
    
    try {
      const files = fs.readdirSync(this.logsDir);
      
      for (const file of files) {
        if (!file.endsWith('.log')) continue;
        
        const filePath = path.join(this.logsDir, file);
        const stats = fs.statSync(filePath);
        
        if (stats.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }
    } catch (err) {
      this.error(LogSource.HELPER, 'LoggerHelper', 'Failed to clear old logs', err);
    }
    
    return deletedCount;
  }
}

export const logger = LoggerHelper.getInstance();
export { LoggerHelper };
