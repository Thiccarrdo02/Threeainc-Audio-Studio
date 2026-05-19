import test from "node:test";
import assert from "node:assert/strict";

import { friendlyError } from "../../lib/error-messages";

test("known codes return mapped copy", () => {
  const result = friendlyError({ code: "PROVIDER_GENERATION_FAILED" });
  assert.equal(result.title, "Audio generation failed");
  assert.ok(result.detail.length > 0);
});

test("unknown codes fall back to UNKNOWN_ERROR copy", () => {
  const result = friendlyError({ code: "NOT_A_REAL_CODE" });
  assert.equal(result.title, "Something went wrong");
});

test("short provider-supplied messages override the canned detail", () => {
  const provided = "Reference voice is too short.";
  const result = friendlyError({
    code: "PROVIDER_GENERATION_FAILED",
    message: provided,
  });
  assert.equal(result.detail, provided);
});

test("excessively long provider messages fall back to canned detail", () => {
  const longMessage = "x".repeat(250);
  const result = friendlyError({
    code: "PROVIDER_GENERATION_FAILED",
    message: longMessage,
  });
  assert.notEqual(result.detail, longMessage);
});

test("retryable flag passes through, defaulting to true", () => {
  assert.equal(friendlyError({ code: "X" }).retryable, true);
  assert.equal(friendlyError({ code: "X", retryable: false }).retryable, false);
});
