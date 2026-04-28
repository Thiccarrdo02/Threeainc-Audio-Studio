import { COST_PER_1K_CHARS } from "@/config/pricing";

export function countBillableCharacters(prompt: string): number {
  return prompt.trim().length;
}

export function estimateCharacterCost(characterCount: number): number {
  return Number(((characterCount * COST_PER_1K_CHARS) / 1000).toFixed(4));
}

export function estimatePromptCost(prompt: string): number {
  return estimateCharacterCost(countBillableCharacters(prompt));
}
