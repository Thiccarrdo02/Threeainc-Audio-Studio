import test from "node:test";
import assert from "node:assert/strict";

import {
  getErrorMessage,
  isRetryableProviderError,
  isRetryableStatus,
  isTimeoutError,
  jsonError,
  sanitizeProviderMessage,
  TimeoutError,
  withTimeout,
} from "../../lib/api-utils";

test("sanitizeProviderMessage redacts common secret patterns", () => {
  assert.equal(
    sanitizeProviderMessage("Bad request key=abc123def authorization=foo"),
    "Bad request key=[redacted] authorization=[redacted]",
  );
  assert.equal(
    sanitizeProviderMessage("Sent Bearer eyJhbGciOiJIUzI1Ni"),
    "Sent Bearer [redacted]",
  );
  assert.equal(
    sanitizeProviderMessage("api key: sk_abc1234567890123456789xyz"),
    "api key=[redacted]",
  );
  assert.equal(
    sanitizeProviderMessage("xi-api-key=verysecret"),
    "xi-api-key=[redacted]",
  );
});

test("sanitizeProviderMessage truncates at the configured length", () => {
  const long = "x".repeat(500);
  assert.equal(sanitizeProviderMessage(long).length, 240);
});

test("sanitizeProviderMessage tolerates empty input", () => {
  assert.equal(sanitizeProviderMessage(""), "");
});

test("getErrorMessage prefers Error.message, then nested fields", () => {
  assert.equal(getErrorMessage(new Error("boom"), "fallback"), "boom");
  assert.equal(getErrorMessage({ detail: "from detail" }, "fb"), "from detail");
  assert.equal(getErrorMessage({}, "fb"), "fb");
  assert.equal(getErrorMessage(undefined, "fb"), "fb");
});

test("isRetryableStatus picks transient codes only", () => {
  assert.equal(isRetryableStatus(200), false);
  assert.equal(isRetryableStatus(400), false);
  assert.equal(isRetryableStatus(404), false);
  assert.equal(isRetryableStatus(408), true);
  assert.equal(isRetryableStatus(429), true);
  assert.equal(isRetryableStatus(500), true);
  assert.equal(isRetryableStatus(503), true);
});

test("isRetryableProviderError reads status from common shapes", () => {
  assert.equal(isRetryableProviderError({ status: 503 }), true);
  assert.equal(isRetryableProviderError({ statusCode: 400 }), false);
  assert.equal(isRetryableProviderError(null), false);
  // No status info → treat as transient
  assert.equal(isRetryableProviderError(new Error("network")), true);
});

test("jsonError sanitizes the message and returns the expected shape", async () => {
  const response = jsonError({
    status: 400,
    code: "TEST",
    message: "leak key=abc123",
  });
  assert.equal(response.status, 400);
  const body = (await response.json()) as {
    error: { code: string; message: string; retryable: boolean };
  };
  assert.equal(body.error.code, "TEST");
  assert.equal(body.error.message, "leak key=[redacted]");
  assert.equal(body.error.retryable, false);
});

test("withTimeout resolves before deadline", async () => {
  const value = await withTimeout(async () => 42, 200);
  assert.equal(value, 42);
});

test("withTimeout throws TimeoutError when exceeded", async () => {
  await assert.rejects(
    () =>
      withTimeout(
        () => new Promise((resolve) => setTimeout(resolve, 200)),
        50,
      ),
    (error: unknown) => {
      assert.ok(isTimeoutError(error));
      assert.ok(error instanceof TimeoutError);
      return true;
    },
  );
});
