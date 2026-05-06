import {
  CUSTOM_VOICE_TEXT_COST_PER_1K_CHARACTERS_USD,
  CUSTOM_VOICE_TRANSFORM_COST_PER_MINUTE_USD,
  FAL_COST_PER_1K_CHARACTERS_USD,
  MINIMUM_THREEZINC_CREDITS,
  THREEZINC_CREDIT_INCREMENT,
  THREEZINC_CREDITS_PER_USD,
  THREEZINC_MARKUP_MULTIPLIER,
} from "@/config/pricing";

export function countBillableCharacters(prompt: string): number {
  return prompt.trim().length;
}

export function estimateFalCostUsd(characterCount: number): number {
  return Number(
    ((characterCount * FAL_COST_PER_1K_CHARACTERS_USD) / 1000).toFixed(4),
  );
}

export function estimateCustomVoiceTextCostUsd(characterCount: number): number {
  return Number(
    (
      (characterCount * CUSTOM_VOICE_TEXT_COST_PER_1K_CHARACTERS_USD) /
      1000
    ).toFixed(4),
  );
}

export function estimateCustomVoiceTransformCostUsd(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 0;
  }

  return Number(
    (
      (seconds / 60) *
      CUSTOM_VOICE_TRANSFORM_COST_PER_MINUTE_USD
    ).toFixed(4),
  );
}

export function estimateThreeZincChargeUsd(characterCount: number): number {
  return Number(
    (estimateFalCostUsd(characterCount) * THREEZINC_MARKUP_MULTIPLIER).toFixed(4),
  );
}

export function estimateThreeZincChargeFromCostUsd(costUsd: number): number {
  return Number((costUsd * THREEZINC_MARKUP_MULTIPLIER).toFixed(4));
}

export function roundToCreditIncrement(credits: number): number {
  const rounded =
    Math.ceil(credits / THREEZINC_CREDIT_INCREMENT) *
    THREEZINC_CREDIT_INCREMENT;
  return Number(Math.max(MINIMUM_THREEZINC_CREDITS, rounded).toFixed(1));
}

export function estimateCharacterCredits(characterCount: number): number {
  if (characterCount <= 0) {
    return 0;
  }

  const rawCredits =
    estimateThreeZincChargeUsd(characterCount) * THREEZINC_CREDITS_PER_USD;
  return roundToCreditIncrement(rawCredits);
}

export function estimateCreditsFromCostUsd(costUsd: number): number {
  if (costUsd <= 0) {
    return 0;
  }

  return roundToCreditIncrement(
    estimateThreeZincChargeFromCostUsd(costUsd) * THREEZINC_CREDITS_PER_USD,
  );
}

export function estimatePromptCredits(prompt: string): number {
  return estimateCharacterCredits(countBillableCharacters(prompt));
}

export function formatCredits(credits: number): string {
  return `${credits.toFixed(credits % 1 === 0 ? 0 : 1)} credits`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(value > 0 && value < 0.01 ? 4 : 2)}`;
}
