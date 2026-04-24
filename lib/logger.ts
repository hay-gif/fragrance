/**
 * Structured logger for Fragrance OS.
 *
 * Client-side: sends errors to /api/log (non-blocking).
 * Server-side: writes JSON to stdout (captured by Vercel/any log aggregator).
 *
 * To add Sentry later:
 *   npm install @sentry/nextjs
 *   Then replace the `_sendToServer` call with `Sentry.captureException(error, { extra: context })`.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    digest?: string;
  };
  timestamp: string;
  env: "client" | "server";
}

function buildEntry(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  err?: Error & { digest?: string }
): LogEntry {
  return {
    level,
    message,
    context,
    error: err
      ? { name: err.name, message: err.message, stack: err.stack, digest: err.digest }
      : undefined,
    timestamp: new Date().toISOString(),
    env: typeof window === "undefined" ? "server" : "client",
  };
}

/** Non-blocking fire-and-forget POST to /api/log */
function _sendToServer(entry: LogEntry): void {
  if (typeof window === "undefined") return; // already on server — just log to stdout
  try {
    fetch("/api/log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      // keepalive keeps the request alive even if the page unloads
      keepalive: true,
    }).catch(() => {
      // swallow — we never want logging to throw
    });
  } catch {
    // swallow
  }
}

function _log(level: LogLevel, message: string, context?: Record<string, unknown>, err?: Error & { digest?: string }) {
  const entry = buildEntry(level, message, context, err);

  if (typeof window === "undefined") {
    // Server: structured JSON line — Vercel Log Drains / any aggregator picks this up
    const line = JSON.stringify(entry);
    if (level === "error" || level === "warn") {
      process.stderr.write(line + "\n");
    } else {
      process.stdout.write(line + "\n");
    }
  } else {
    // Client: human-readable in DevTools + ship errors to /api/log in production
    const devLabel = `[${level.toUpperCase()}] ${message}`;
    if (process.env.NODE_ENV !== "production") {
      if (level === "error") console.error(devLabel, context ?? "", err ?? "");
      else if (level === "warn") console.warn(devLabel, context ?? "");
      else if (level === "debug") console.debug(devLabel, context ?? "");
      else console.log(devLabel, context ?? "");
    }
    if (level === "error" || level === "warn") {
      _sendToServer(entry);
    }
  }
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) =>
    _log("debug", message, context),

  info: (message: string, context?: Record<string, unknown>) =>
    _log("info", message, context),

  warn: (message: string, context?: Record<string, unknown>) =>
    _log("warn", message, context),

  error: (message: string, err?: Error & { digest?: string }, context?: Record<string, unknown>) =>
    _log("error", message, context, err),

  /** Convenience: log a caught error from an error boundary */
  capture: (err: Error & { digest?: string }, context?: Record<string, unknown>) =>
    _log("error", err.message, context, err),
};
