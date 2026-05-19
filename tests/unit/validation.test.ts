import test from "node:test";
import assert from "node:assert/strict";

import {
  isProviderNotImplemented,
  validateTTSRequest,
} from "../../lib/tts-validation";

function ok<T>(result: { ok: true; value: T } | { ok: false }) {
  if (!result.ok) throw new Error("validation unexpectedly failed");
  return result.value;
}

test("rejects non-object bodies", () => {
  assert.equal(validateTTSRequest(null).ok, false);
  assert.equal(validateTTSRequest("string").ok, false);
  assert.equal(validateTTSRequest(42).ok, false);
  assert.equal(validateTTSRequest([]).ok, false);
});

test("requires prompt and mode at minimum", () => {
  const result = validateTTSRequest({});
  assert.equal(result.ok, false);
  if (!result.ok) {
    const fields = new Set(result.issues.map((issue) => issue.field));
    assert.ok(fields.has("prompt"));
    assert.ok(fields.has("mode"));
  }
});

test("accepts a minimal single-voice request", () => {
  const value = ok(
    validateTTSRequest({
      prompt: "Hello world",
      mode: "single",
      voice: "Kore",
    }),
  );
  assert.equal(value.mode, "single");
  assert.equal(value.voice, "Kore");
  assert.equal(value.provider, "gemini");
  assert.equal(value.output_format, "mp3");
});

test("multi-speaker requires speakers array with unique alphanumeric aliases", () => {
  const dupResult = validateTTSRequest({
    prompt: "A: hi\nA: there",
    mode: "multi",
    speakers: [
      { speaker_id: "A", voice: "Kore" },
      { speaker_id: "A", voice: "Puck" },
    ],
  });
  assert.equal(dupResult.ok, false);

  const badAliasResult = validateTTSRequest({
    prompt: "S1: hi\nS-2: there",
    mode: "multi",
    speakers: [
      { speaker_id: "S1", voice: "Kore" },
      { speaker_id: "S-2", voice: "Puck" },
    ],
  });
  assert.equal(badAliasResult.ok, false);

  const goodResult = validateTTSRequest({
    prompt: "S1: hi\nS2: there",
    mode: "multi",
    speakers: [
      { speaker_id: "S1", voice: "Kore" },
      { speaker_id: "S2", voice: "Puck" },
    ],
  });
  assert.equal(goodResult.ok, true);
});

test("rejects unknown output_format and provider", () => {
  const bad1 = validateTTSRequest({
    prompt: "hi",
    mode: "single",
    voice: "Kore",
    output_format: "flac",
  });
  assert.equal(bad1.ok, false);

  const bad2 = validateTTSRequest({
    prompt: "hi",
    mode: "single",
    voice: "Kore",
    provider: "openai",
  });
  assert.equal(bad2.ok, false);
});

test("temperature must be within bounds", () => {
  const tooLow = validateTTSRequest({
    prompt: "hi",
    mode: "single",
    voice: "Kore",
    temperature: -1,
  });
  assert.equal(tooLow.ok, false);

  const tooHigh = validateTTSRequest({
    prompt: "hi",
    mode: "single",
    voice: "Kore",
    temperature: 5,
  });
  assert.equal(tooHigh.ok, false);

  const just_right = validateTTSRequest({
    prompt: "hi",
    mode: "single",
    voice: "Kore",
    temperature: 1.0,
  });
  assert.equal(just_right.ok, true);
});

test("isProviderNotImplemented is a no-op now (no openai placeholder)", () => {
  assert.equal(isProviderNotImplemented("gemini"), false);
  assert.equal(isProviderNotImplemented("custom"), false);
});
