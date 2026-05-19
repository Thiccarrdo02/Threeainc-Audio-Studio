import { NextResponse } from "next/server";

import type { TTSApiError } from "@/types/tts";

/**
 * Remove API key fragments from any string before exposing it to the client.
 * Patterns covered: "key=…", "authorization=…", inline "xi-api-key" / "Bearer …",
 * plus long base64-ish runs that look like secrets.
 */
export function sanitizeProviderMessage(message: string, maxLength = 240): string {
  if (!message) return "";

  return message
    .replace(/key[=:]\s*[^,\s"']+/gi, "key=[redacted]")
    .replace(/authorization[=:]\s*[^,\s"']+/gi, "authorization=[redacted]")
    .replace(/xi-api-key[=:]\s*[^,\s"']+/gi, "xi-api-key=[redacted]")
    .replace(/bearer\s+[a-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/sk_[a-z0-9]{20,}/gi, "[redacted]")
    .replace(/[a-f0-9]{32,}/gi, "[redacted]")
    .slice(0, maxLength)
    .trim();
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  if (typeof error === "object" && error !== null) {
    const candidate = error as Record<string, unknown>;
    for (const key of ["message", "detail", "error"]) {
      const value = candidate[key];
      if (typeof value === "string" && value.length > 0) return value;
    }
  }
  return fallback;
}

export function isRetryableStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

/** Inspect provider errors and decide whether a retry is worth attempting. */
export function isRetryableProviderError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }
  const candidate = error as Record<string, unknown>;
  const status = candidate.status ?? candidate.statusCode;
  if (typeof status === "number") {
    return isRetryableStatus(status);
  }
  // No status info → treat as transient (network glitch / abort).
  return true;
}

interface ApiErrorOptions {
  status: number;
  code: string;
  message: string;
  retryable?: boolean;
  details?: unknown;
  // Optional source string included in logs (e.g. "elevenlabs", "fal").
  source?: string;
}

export function jsonError(options: ApiErrorOptions) {
  const sanitizedMessage = sanitizeProviderMessage(options.message);
  const body: TTSApiError = {
    error: {
      code: options.code,
      message: sanitizedMessage || "Request failed.",
      retryable: options.retryable ?? isRetryableStatus(options.status),
      ...(options.details === undefined ? {} : { details: options.details }),
    },
  };
  return NextResponse.json(body, { status: options.status });
}

/**
 * Run a promise with an abort-based timeout. Resolves with the value or rejects
 * with a TimeoutError. The caller is responsible for passing the AbortSignal
 * through to anything cancellable.
 */
export class TimeoutError extends Error {
  readonly timeoutMs: number;
  constructor(timeoutMs: number) {
    super(`Operation timed out after ${timeoutMs}ms`);
    this.name = "TimeoutError";
    this.timeoutMs = timeoutMs;
  }
}

export async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(timeoutMs));
    }, timeoutMs);
  });
  try {
    return await Promise.race([fn(controller.signal), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}
