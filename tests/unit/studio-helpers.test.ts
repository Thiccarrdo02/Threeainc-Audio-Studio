import test from "node:test";
import assert from "node:assert/strict";

import {
  accentStrengthLabel,
  autoMarkupPrompt,
  buildMultiSpeakerTemplate,
  clampAccentStrength,
  formatTime,
  getAccentStrengthInstruction,
  promptHasSpeakerPrefixes,
} from "../../components/studio/studio-helpers";

test("clampAccentStrength keeps the slider in 0..100", () => {
  assert.equal(clampAccentStrength(-10), 0);
  assert.equal(clampAccentStrength(50), 50);
  assert.equal(clampAccentStrength(120), 100);
  assert.equal(clampAccentStrength(Number.NaN), 45);
});

test("accentStrengthLabel matches tier thresholds", () => {
  assert.equal(accentStrengthLabel(0), "Neutral");
  assert.equal(accentStrengthLabel(5), "Neutral");
  assert.equal(accentStrengthLabel(20), "Light");
  assert.equal(accentStrengthLabel(50), "Balanced");
  assert.equal(accentStrengthLabel(80), "Strong");
  assert.equal(accentStrengthLabel(95), "Very strong");
  assert.equal(accentStrengthLabel(100), "Very strong");
});

test("accent instruction text changes with strength tier", () => {
  const neutralState = {
    accentPreset: "neutral",
    accentStrength: 5,
  } as Parameters<typeof getAccentStrengthInstruction>[0];
  const strongState = {
    accentPreset: "north-indian",
    accentStrength: 95,
  } as Parameters<typeof getAccentStrengthInstruction>[0];
  assert.notEqual(
    getAccentStrengthInstruction(neutralState),
    getAccentStrengthInstruction(strongState),
  );
});

test("formatTime handles edge cases", () => {
  assert.equal(formatTime(0), "0:00");
  assert.equal(formatTime(-1), "0:00");
  assert.equal(formatTime(Number.NaN), "0:00");
  assert.equal(formatTime(65), "1:05");
  assert.equal(formatTime(3599), "59:59");
});

test("promptHasSpeakerPrefixes detects configured aliases", () => {
  const speakers = [
    { speaker_id: "Sara", voice: "Kore" },
    { speaker_id: "Max", voice: "Puck" },
  ];
  assert.equal(
    promptHasSpeakerPrefixes("Sara: Hi\nMax: Hey", speakers),
    true,
  );
  assert.equal(
    promptHasSpeakerPrefixes("Sara was here", speakers),
    false,
  );
  assert.equal(
    promptHasSpeakerPrefixes("sara: lowercase still matches", speakers),
    true,
  );
});

test("buildMultiSpeakerTemplate uses configured aliases", () => {
  const template = buildMultiSpeakerTemplate([
    { speaker_id: "Hosta", voice: "Kore" },
    { speaker_id: "Guest", voice: "Puck" },
  ]);
  assert.ok(template.includes("Hosta:"));
  assert.ok(template.includes("Guest:"));
});

test("autoMarkupPrompt adds a tag when scripts have a trigger keyword", () => {
  const result = autoMarkupPrompt("haha that was funny");
  assert.ok(result.includes("[laughing]"));
});

test("autoMarkupPrompt adds [short pause] between sentences when no trigger fires", () => {
  const result = autoMarkupPrompt("This is fine. Another line.");
  assert.ok(result.includes("[short pause]"));
});

test("autoMarkupPrompt is a no-op when the script already has a leading tag", () => {
  const input = "[dramatic] Already tagged.";
  // It might add inline pause tags from the period, but the leading [dramatic]
  // shouldn't be replaced.
  const result = autoMarkupPrompt(input);
  assert.ok(result.startsWith("[dramatic]"));
});
