/**
 * Consistent logging system for the application
 * Provides pretty, categorized logging with different levels
 * Logs are forwarded to Tauri's logging plugin for persistent file storage
 */

import {
  attachConsole,
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from '@tauri-apps/plugin-log';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LoggerOptions {
  /** Minimum log level to display */
  minLevel?: LogLevel;
  /** Whether to include timestamps */
  timestamps?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// Get log level from environment or default to 'info' in production, 'debug' in development
const getDefaultMinLevel = (): LogLevel => {
  // In development (Vite), show debug logs. In production, show info+
  // Check for common development indicators
  const isDev =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port !== '');
  return isDev ? 'debug' : 'info';
};

// Forward logs to Tauri's logging plugin for file persistence
const forwardToTauri = (level: LogLevel, category: string, message: string) => {
  const formattedMessage = `[${category}] ${message}`;
  switch (level) {
    case 'debug':
      tauriDebug(formattedMessage);
      break;
    case 'info':
      tauriInfo(formattedMessage);
      break;
    case 'warn':
      tauriWarn(formattedMessage);
      break;
    case 'error':
      tauriError(formattedMessage);
      break;
  }
};

// Attach console to receive logs from Rust side (for Webview target)
let consoleAttached = false;
export const initLogger = async () => {
  if (consoleAttached) return;
  try {
    await attachConsole();
    consoleAttached = true;
  } catch (e) {
    console.warn('Failed to attach console to Tauri logger:', e);
  }
};

class Logger {
  private category: string;
  private color: string;
  private options: Required<LoggerOptions>;

  constructor(category: string, color?: string, options: LoggerOptions = {}) {
    this.category = category;
    this.color = color ?? '#6366f1'; // default indigo
    this.options = {
      minLevel: options.minLevel ?? getDefaultMinLevel(),
      timestamps: options.timestamps ?? false,
    };
  }

  private shouldLog(level: LogLevel) {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.options.minLevel];
  }

  private formatPrefix(_level: LogLevel) {
    const parts: string[] = [];

    if (this.options.timestamps) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      } as Intl.DateTimeFormatOptions);
      parts.push(`%c${time}`);
    }

    parts.push(`%c[${this.category}]`);

    return parts;
  }

  private getStyles(_level: LogLevel) {
    const styles: string[] = [];

    if (this.options.timestamps) {
      styles.push('color: #9ca3af; font-weight: normal;'); // timestamp in gray
    }

    styles.push(`color: ${this.color}; font-weight: bold;`); // category

    return styles;
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.shouldLog(level)) return;

    const prefix = this.formatPrefix(level);
    const styles = this.getStyles(level);

    const logMethod =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;

    // Format message with args for Tauri logging
    const fullMessage =
      args.length > 0
        ? `${message} ${args
            .map((a) => {
              // Handle Error objects specially since JSON.stringify returns {}
              if (a instanceof Error) {
                return JSON.stringify({
                  ...a, // Include any custom properties
                  name: a.name,
                  message: a.message,
                  stack: a.stack,
                });
              }
              return JSON.stringify(a);
            })
            .join(' ')}`
        : message;

    // Forward to Tauri for file persistence
    forwardToTauri(level, this.category, fullMessage);

    if (args.length > 0) {
      logMethod(`${prefix.join(' ')} ${message}`, ...styles, ...args);
    } else {
      logMethod(`${prefix.join(' ')} ${message}`, ...styles);
    }
  }

  debug(message: string, ...args: unknown[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: unknown[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: unknown[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: unknown[]) {
    this.log('error', message, ...args);
  }

  /** Create a child logger with a sub-category */
  child(subCategory: string, color?: string) {
    return new Logger(`${this.category}:${subCategory}`, color ?? this.color, this.options);
  }

  /** Log a group of related messages */
  group(label: string, fn: () => void) {
    if (!this.shouldLog('debug')) return;
    console.group(`%c[${this.category}] ${label}`, `color: ${this.color}; font-weight: bold;`);
    fn();
    console.groupEnd();
  }

  /** Log with timing information */
  time<T>(label: string, fn: () => T) {
    if (!this.shouldLog('debug')) return fn();

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
    return result;
  }

  /** Async version of time */
  async timeAsync<T>(label: string, fn: () => Promise<T>) {
    if (!this.shouldLog('debug')) return fn();

    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;

    this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
    return result;
  }
}

/**
 * Create a logger for a specific category
 *
 * @example
 * const log = createLogger('DataStore', '#10b981');
 * log.info('Task created:', task.id);
 * log.error('Failed to save task:', error);
 */
export const createLogger = (category: string, color?: string, options?: LoggerOptions) => {
  return new Logger(category, color, options);
};

// Pre-configured loggers for common modules
export const loggers = {
  account: createLogger('Account', '#f97316'),
  app: createLogger('App', '#6366f1'),
  bootstrap: createLogger('Bootstrap', '#a855f7'),
  caldav: createLogger('CalDAV', '#f59e0b'),
  database: createLogger('Database', '#8b5cf6'),
  dataStore: createLogger('DataStore', '#10b981'),
  deleteHandlers: createLogger('DeleteHandlers', '#ef4444'),
  errorBoundary: createLogger('ErrorBoundary', '#dc2626'),
  export: createLogger('Export', '#f59e0b'),
  fileDrop: createLogger('FileDrop', '#eab308'),
  http: createLogger('HTTP', '#6366f1'),
  iCal: createLogger('iCal', '#22c55e'),
  import: createLogger('Import', '#84cc16'),
  main: createLogger('Main', '#a855f7'),
  menu: createLogger('Menu', '#ec4899'),
  notifications: createLogger('Notifications', '#f43f5e'),
  platform: createLogger('Platform', '#f97316'),
  settings: createLogger('Settings', '#d946ef'),
  sync: createLogger('Sync', '#3b82f6'),
  taskList: createLogger('TaskList', '#14b8a6'),
  toastManager: createLogger('ToastManager', '#ef4444'),
  ui: createLogger('UI', '#14b8a6'),
  connectivity: createLogger('Connectivity', '#06b6d4'),
  updater: createLogger('Updater', '#10b981'),
} as const;
