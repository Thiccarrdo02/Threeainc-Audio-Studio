import test from "node:test";
import assert from "node:assert/strict";

import {
  countBillableCharacters,
  estimateFalCostUsd,
  estimateCustomVoiceTextCostUsd,
  estimateCustomVoiceTransformCostUsd,
  estimateThreeZincChargeUsd,
  estimateCharacterCredits,
  estimateCreditsFromCostUsd,
  estimatePromptCredits,
  formatCredits,
  formatUsd,
  roundToCreditIncrement,
} from "../../lib/cost";
import {
  FAL_COST_PER_1K_CHARACTERS_USD,
  CUSTOM_VOICE_TEXT_COST_PER_1K_CHARACTERS_USD,
  MINIMUM_THREEZINC_CREDITS,
  THREEZINC_CREDIT_INCREMENT,
  THREEZINC_CREDITS_PER_USD,
  THREEZINC_MARKUP_MULTIPLIER,
} from "../../config/pricing";

test("countBillableCharacters trims whitespace and counts what's left", () => {
  assert.equal(countBillableCharacters("hello"), 5);
  assert.equal(countBillableCharacters("  spaced  "), 6);
  assert.equal(countBillableCharacters(""), 0);
  assert.equal(countBillableCharacters("   "), 0);
});

test("estimateFalCostUsd scales linearly per 1k chars", () => {
  assert.equal(estimateFalCostUsd(1000), FAL_COST_PER_1K_CHARACTERS_USD);
  assert.equal(estimateFalCostUsd(0), 0);
  const half = estimateFalCostUsd(500);
  assert.ok(Math.abs(half - FAL_COST_PER_1K_CHARACTERS_USD / 2) < 1e-4);
});

test("estimateCustomVoiceTextCostUsd uses the custom voice rate", () => {
  assert.equal(
    estimateCustomVoiceTextCostUsd(1000),
    CUSTOM_VOICE_TEXT_COST_PER_1K_CHARACTERS_USD,
  );
});

test("estimateCustomVoiceTransformCostUsd guards against bad input", () => {
  assert.equal(estimateCustomVoiceTransformCostUsd(0), 0);
  assert.equal(estimateCustomVoiceTransformCostUsd(-10), 0);
  assert.equal(estimateCustomVoiceTransformCostUsd(Number.NaN), 0);
  assert.ok(estimateCustomVoiceTransformCostUsd(60) > 0);
});

test("estimateThreeZincChargeUsd applies the markup multiplier", () => {
  const raw = estimateFalCostUsd(2000);
  const marked = estimateThreeZincChargeUsd(2000);
  assert.ok(Math.abs(marked - raw * THREEZINC_MARKUP_MULTIPLIER) < 1e-4);
});

test("roundToCreditIncrement enforces minimum and step", () => {
  assert.equal(roundToCreditIncrement(0), MINIMUM_THREEZINC_CREDITS);
  assert.equal(roundToCreditIncrement(0.01), MINIMUM_THREEZINC_CREDITS);
  // 1.01 should round up to next 0.5 step (1.5)
  assert.equal(
    roundToCreditIncrement(1.01),
    Math.ceil(1.01 / THREEZINC_CREDIT_INCREMENT) * THREEZINC_CREDIT_INCREMENT,
  );
});

test("estimateCharacterCredits is 0 only for zero/negative", () => {
  assert.equal(estimateCharacterCredits(0), 0);
  assert.equal(estimateCharacterCredits(-10), 0);
  // 1 character → minimum credits (0.5)
  assert.equal(estimateCharacterCredits(1), MINIMUM_THREEZINC_CREDITS);
});

test("estimateCreditsFromCostUsd respects increments", () => {
  assert.equal(estimateCreditsFromCostUsd(0), 0);
  assert.equal(estimateCreditsFromCostUsd(-0.5), 0);
  // 1 USD → 20 credits (THREEZINC_CREDITS_PER_USD) after markup
  const marked = 1 * THREEZINC_MARKUP_MULTIPLIER * THREEZINC_CREDITS_PER_USD;
  assert.equal(estimateCreditsFromCostUsd(1), roundToCreditIncrement(marked));
});

test("estimatePromptCredits trims and counts billable chars", () => {
  assert.equal(estimatePromptCredits("   "), 0);
  assert.ok(estimatePromptCredits("hello world") >= MINIMUM_THREEZINC_CREDITS);
});

test("formatCredits drops decimals only when integer", () => {
  assert.equal(formatCredits(1), "1 credits");
  assert.equal(formatCredits(1.5), "1.5 credits");
  assert.equal(formatCredits(0.5), "0.5 credits");
});

test("formatUsd picks precision based on magnitude", () => {
  assert.equal(formatUsd(0), "$0.00");
  assert.equal(formatUsd(0.005), "$0.0050");
  assert.equal(formatUsd(1.5), "$1.50");
});
