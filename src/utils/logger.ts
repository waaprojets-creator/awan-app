type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  context: Record<string, unknown>;
  timestamp: number;
}

const MAX_ENTRIES = 500;
const inMemoryLog: LogEntry[] = [];

function log(level: LogLevel, message: string, context: Record<string, unknown> = {}): void {
  const entry: LogEntry = { level, message, context, timestamp: Date.now() };
  inMemoryLog.push(entry);
  if (inMemoryLog.length > MAX_ENTRIES) inMemoryLog.shift();
  if (level === 'error') {
    console.error(`[AWAN:${level.toUpperCase()}]`, message, context);
  } else if (level === 'warn') {
    console.warn(`[AWAN:${level.toUpperCase()}]`, message, context);
  }
}

export const logger = {
  info:  (message: string, context?: Record<string, unknown>) => log('info', message, context),
  warn:  (message: string, context?: Record<string, unknown>) => log('warn', message, context),
  error: (err: Error | string, context: Record<string, unknown> = {}) => {
    const message = err instanceof Error ? err.message : err;
    log('error', message, { ...context, stack: err instanceof Error ? err.stack : undefined });
  },
  export: (): string => JSON.stringify(inMemoryLog, null, 2),
  clear:  () => { inMemoryLog.length = 0; },
};
