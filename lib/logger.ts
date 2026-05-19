/**
 * Tiny structured-logging helper. Outputs single-line JSON so log aggregators
 * (or just `grep`) can parse it cleanly. Server-side only.
 */

type Level = "info" | "warn" | "error" | "debug";

const LEVEL_RANK: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function currentLevelThreshold(): number {
  const raw = process.env.LOG_LEVEL?.toLowerCase() as Level | undefined;
  if (raw && raw in LEVEL_RANK) {
    return LEVEL_RANK[raw];
  }
  return process.env.NODE_ENV === "production" ? LEVEL_RANK.info : LEVEL_RANK.debug;
}

function emit(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVEL_RANK[level] < currentLevelThreshold()) return;
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  };
  const line = JSON.stringify(payload);
  if (level === "error" || level === "warn") {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  info: (message: string, context?: Record<string, unknown>) =>
    emit("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) =>
    emit("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) =>
    emit("error", message, context),
  debug: (message: string, context?: Record<string, unknown>) =>
    emit("debug", message, context),
};

/**
 * Wraps a route handler with one-line access logging. Use for any /api route.
 * Emits an entry whether the handler resolves or throws, capturing the elapsed
 * time and final status.
 */
export function withRequestLogging<TArgs extends unknown[]>(
  handler: (request: Request, ...args: TArgs) => Promise<Response>,
  routeName: string,
) {
  return async (request: Request, ...args: TArgs): Promise<Response> => {
    const start = Date.now();
    let response: Response | undefined;
    try {
      response = await handler(request, ...args);
      return response;
    } finally {
      const elapsedMs = Date.now() - start;
      logger.info("api.request", {
        route: routeName,
        method: request.method,
        status: response?.status ?? 500,
        elapsedMs,
      });
    }
  };
}
