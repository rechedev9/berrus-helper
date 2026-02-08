type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  readonly debug: (message: string, data?: unknown) => void;
  readonly info: (message: string, data?: unknown) => void;
  readonly warn: (message: string, data?: unknown) => void;
  readonly error: (message: string, data?: unknown) => void;
}

const LOG_LEVELS: Readonly<Record<LogLevel, number>> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
} as const;

export function createLogger(prefix: string, minLevel: LogLevel = "debug"): Logger {
  const threshold = LOG_LEVELS[minLevel];

  function log(level: LogLevel, message: string, data?: unknown): void {
    if (LOG_LEVELS[level] < threshold) {
      return;
    }
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}][${prefix}][${level.toUpperCase()}] ${message}`;

    switch (level) {
      case "debug":
        console.debug(formatted, data !== undefined ? data : "");
        break;
      case "info":
        console.info(formatted, data !== undefined ? data : "");
        break;
      case "warn":
        console.warn(formatted, data !== undefined ? data : "");
        break;
      case "error":
        console.error(formatted, data !== undefined ? data : "");
        break;
    }
  }

  return {
    debug: (message: string, data?: unknown): void => log("debug", message, data),
    info: (message: string, data?: unknown): void => log("info", message, data),
    warn: (message: string, data?: unknown): void => log("warn", message, data),
    error: (message: string, data?: unknown): void => log("error", message, data),
  };
}
