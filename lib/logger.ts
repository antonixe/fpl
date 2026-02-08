/**
 * Structured logger for server and client-side observability.
 * Outputs JSON in production for log aggregation (Vercel, Datadog, etc.)
 * and human-readable format in development.
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('Data fetched', { source: 'fpl-api', latency: 120 });
 *   logger.error('Fetch failed', { path: '/api/fpl', error: err });
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[MIN_LEVEL];
}

function formatError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return {
      name: err.name,
      message: err.message,
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
    };
  }
  return { message: String(err) };
}

function emit(entry: LogEntry) {
  const isProd = process.env.NODE_ENV === 'production';
  const method = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log';

  if (isProd) {
    // Structured JSON for log aggregation
    console[method](JSON.stringify(entry));
  } else {
    // Human-readable for dev
    const prefix = `[${entry.level.toUpperCase()}]`;
    const parts = [prefix, entry.message];
    if (entry.data && Object.keys(entry.data).length > 0) {
      console[method](...parts, entry.data);
    } else {
      console[method](...parts);
    }
  }
}

function log(level: LogLevel, message: string, data?: Record<string, unknown>) {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  };

  emit(entry);
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => log('debug', message, data),
  info: (message: string, data?: Record<string, unknown>) => log('info', message, data),
  warn: (message: string, data?: Record<string, unknown>) => log('warn', message, data),
  error: (message: string, data?: Record<string, unknown>) => log('error', message, data),

  /** Log an error with automatic serialization */
  logError: (message: string, err: unknown, extra?: Record<string, unknown>) => {
    log('error', message, { ...formatError(err), ...extra });
  },

  /** Time an async operation and log its duration */
  async time<T>(label: string, fn: () => Promise<T>, extra?: Record<string, unknown>): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = Math.round(performance.now() - start);
      log('info', label, { duration_ms: duration, status: 'ok', ...extra });
      return result;
    } catch (err) {
      const duration = Math.round(performance.now() - start);
      const errObj = formatError(err);
      // Skip logging expected build-time dynamic server errors
      const isDynamic = typeof errObj.message === 'string' && errObj.message.includes('Dynamic server usage');
      if (!isDynamic) {
        log('error', label, { duration_ms: duration, status: 'error', ...errObj, ...extra });
      }
      throw err;
    }
  },
};
