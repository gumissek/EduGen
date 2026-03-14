/**
 * Lightweight logger with ISO-8601 timestamps for EduGen frontend.
 *
 * Wraps the browser/Node console methods with a structured prefix:
 *   2024-01-15T12:30:45.123Z [INFO]  message
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.info('User logged in', { userId });
 *   logger.error('API call failed', error);
 */

type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

/** Returns the current UTC timestamp in ISO-8601 format. */
function timestamp(): string {
  return new Date().toISOString();
}

/** Pad level string to a fixed width for aligned output. */
function formatLevel(level: LogLevel): string {
  return `[${level.padEnd(5)}]`;
}

function log(level: LogLevel, ...args: unknown[]): void {
  const prefix = `${timestamp()} ${formatLevel(level)}`;
  switch (level) {
    case 'DEBUG':
      console.debug(prefix, ...args);
      break;
    case 'INFO':
      console.info(prefix, ...args);
      break;
    case 'WARN':
      console.warn(prefix, ...args);
      break;
    case 'ERROR':
      console.error(prefix, ...args);
      break;
  }
}

export const logger = {
  /** Verbose diagnostic messages (development only). */
  debug: (...args: unknown[]): void => log('DEBUG', ...args),
  /** General informational messages. */
  info: (...args: unknown[]): void => log('INFO', ...args),
  /** Potentially harmful situations that don't stop the app. */
  warn: (...args: unknown[]): void => log('WARN', ...args),
  /** Error events — operation failed but the app may continue. */
  error: (...args: unknown[]): void => log('ERROR', ...args),
};
