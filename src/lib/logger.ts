/**
 * consistent logging system for the application
 * provides pretty, categorized logging with different levels
 * logs are forwarded to Tauri's logging plugin for persistent file storage
 */

import {
  debug as tauriDebug,
  error as tauriError,
  info as tauriInfo,
  warn as tauriWarn,
} from '@tauri-apps/plugin-log';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  /** minimum log level to display */
  minLevel?: LogLevel;
  /** whether to include timestamps */
  timestamps?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// get log level from environment or default to 'info' in production, 'debug' in development
const getDefaultMinLevel = (): LogLevel => {
  return import.meta.env.DEV ? 'debug' : 'info';
};

// forward logs to Tauri's logging plugin for file persistence
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !(value instanceof Error) && !Array.isArray(value);

// a stack flattened into a single escaped line is unreadable and floods the
// rotated log file, so only the message is carried into the forwarded line
const formatLogValue = (value: unknown): string => {
  if (value instanceof Error) return value.message;
  if (Array.isArray(value)) return value.map(formatLogValue).join(', ');

  return String(value);
};

const formatLogPairs = (value: Record<string, unknown>, prefix: string): string[] =>
  Object.entries(value).flatMap(([key, entry]) =>
    isRecord(entry) && Object.keys(entry).length > 0
      ? formatLogPairs(entry, `${prefix}${key}.`)
      : [`${prefix}${key}: ${formatLogValue(entry)}`],
  );

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

  private formatLine(text: string, includeTimestamp: boolean) {
    const parts: string[] = [];
    const styles: string[] = [];

    if (includeTimestamp && this.options.timestamps) {
      const now = new Date();
      const time = now.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      } as Intl.DateTimeFormatOptions);
      parts.push(`%c${time}`);
      styles.push('color: #9ca3af; font-weight: normal;');
    }

    parts.push(`%c[${this.category}]`);
    styles.push(`color: ${this.color}; font-weight: bold;`);

    parts.push(`%c${text}`);
    styles.push('');

    return { line: parts.join(' '), styles };
  }

  private log(level: LogLevel, message: string, ...args: unknown[]) {
    if (!this.shouldLog(level)) return;

    const { line, styles } = this.formatLine(message, true);

    const logMethod =
      level === 'error'
        ? console.error
        : level === 'warn'
          ? console.warn
          : level === 'debug'
            ? console.debug
            : console.log;

    // render args as prose rather than a JSON blob so forwarded lines stay readable
    const context = args.flatMap((arg) =>
      isRecord(arg) ? formatLogPairs(arg, '') : [formatLogValue(arg)],
    );
    const fullMessage = context.length > 0 ? `${message} (${context.join(', ')})` : message;

    // forward to Tauri for file persistence
    forwardToTauri(level, this.category, fullMessage);

    logMethod(line, ...styles, ...args);
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

  /** create a child logger with a sub-category */
  child(subCategory: string, color?: string) {
    return new Logger(`${this.category}:${subCategory}`, color ?? this.color, this.options);
  }

  /** log a group of related messages */
  group(label: string, fn: () => void) {
    if (!this.shouldLog('debug')) return;
    const { line, styles } = this.formatLine(label, false);
    console.group(line, ...styles);
    fn();
    console.groupEnd();
  }

  /** log with timing information */
  time<T>(label: string, fn: () => T) {
    if (!this.shouldLog('debug')) return fn();

    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;

    this.debug(`${label} completed in ${duration.toFixed(2)}ms`);
    return result;
  }

  /** async version of time */
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
 * create a logger for a specific category
 *
 * @example
 * const log = createLogger('DataStore', '#10b981');
 * log.info('Task created:', task.id);
 * log.error('Failed to save task:', error);
 */
export const createLogger = (category: string, color?: string, options?: LoggerOptions) => {
  return new Logger(category, color, options);
};

// pre-configured loggers for common modules
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
