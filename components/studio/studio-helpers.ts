import { ACCENT_STRENGTH_TIERS } from "@/config/limits";
import {
  ACCENT_PRESETS,
  PACE_PRESETS,
  TONE_PRESETS,
  getPresetInstruction,
} from "@/config/style-presets";
import { MVP_VOICES } from "@/config/voices";
import type {
  LanguageOption,
  Speaker,
  StudioState,
} from "@/types/tts";

export function clampAccentStrength(value: number) {
  if (!Number.isFinite(value)) {
    return 45;
  }
  return Math.min(100, Math.max(0, value));
}

export function accentStrengthLabel(value: number) {
  const strength = clampAccentStrength(value);
  for (const tier of ACCENT_STRENGTH_TIERS) {
    if (strength <= tier.max) return tier.label;
  }
  return ACCENT_STRENGTH_TIERS[ACCENT_STRENGTH_TIERS.length - 1].label;
}

export function getAccentStrengthInstruction(state: StudioState) {
  const strength = clampAccentStrength(state.accentStrength);

  if (state.accentPreset === "neutral" || strength <= 5) {
    return "Keep regional accent influence very light and prioritize neutral, broadly understandable pronunciation.";
  }
  if (strength <= 30) {
    return "Apply the selected accent subtly; avoid heavy regional pronunciation.";
  }
  if (strength <= 65) {
    return "Apply the selected accent at a natural medium strength while keeping every word clear.";
  }
  if (strength <= 90) {
    return "Use a clear, noticeable selected accent while preserving intelligibility.";
  }
  return "Use a strong selected accent, but keep speech clean, polished, and easy to understand.";
}

export function composeStyleInstructions(state: StudioState) {
  const presetInstructions = [
    getPresetInstruction(ACCENT_PRESETS, state.accentPreset),
    getAccentStrengthInstruction(state),
    getPresetInstruction(TONE_PRESETS, state.tonePreset),
    getPresetInstruction(PACE_PRESETS, state.pacePreset),
  ];

  return [...presetInstructions, state.styleInstructions.trim()]
    .filter(Boolean)
    .join(" ");
}

export function languageOptionLabel(language: LanguageOption) {
  if (language.id === "auto") {
    return language.label;
  }

  return language.region === "India"
    ? `India - ${language.label}`
    : `${language.region ?? "Global"} - ${language.label}`;
}

export function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function getVoiceName(voiceId: string) {
  return MVP_VOICES.find((voice) => voice.id === voiceId)?.displayName ?? voiceId;
}

export function isMvpSelected(voiceId: string) {
  return MVP_VOICES.some((voice) => voice.id === voiceId);
}

export function speakerButtonLabel(speaker: Speaker, index: number) {
  const alias = speaker.speaker_id || `Speaker${index + 1}`;
  return `${alias} - ${getVoiceName(speaker.voice)}`;
}

export function promptHasSpeakerPrefixes(
  prompt: string,
  speakers: Speaker[],
) {
  return speakers.some((speaker) =>
    new RegExp(`(^|\\n)${speaker.speaker_id}:`, "i").test(prompt),
  );
}

export function hasLeadingAudioTag(text: string) {
  return /^\s*(?:[A-Za-z0-9]+:\s*)?\[[^\]]+\]/.test(text);
}

function addTagAfterSpeakerPrefix(line: string, tag: string) {
  const match = line.match(/^(\s*[A-Za-z0-9]+:\s*)(.*)$/);
  if (match) {
    return `${match[1]}${tag} ${match[2].trimStart()}`;
  }
  return `${tag} ${line.trimStart()}`;
}

function autoMarkupLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return line;

  let next = line.replace(/\s*\.\.\.\s*/g, " [long pause] ");
  if (hasLeadingAudioTag(next)) return next;

  const lower = trimmed.toLowerCase();
  const isLoud = /(!{2,}|urgent|now|stop|look out|watch out)/i.test(trimmed);
  const isLaughing = /(haha|lol|funny|joke|laugh|hilarious|smiled?)/i.test(trimmed);
  const isSigh = /(sorry|unfortunately|tired|exhausted|sad|miss you|bad news)/i.test(trimmed);
  const isWhisper = /(secret|quietly|keep this between us|listen closely)/i.test(trimmed);
  const isSarcastic = /(yeah right|as if|obviously|sure, because)/i.test(lower);
  const isHesitation = /^(?:[A-Za-z0-9]+:\s*)?(well|um|uh|hmm|actually)\b/i.test(trimmed);
  const isCheerful = /(great news|welcome|congrats|congratulations|happy|delighted)/i.test(trimmed);
  const isDramatic = /(final chance|never forget|betray|betrayed|destiny|at last)/i.test(trimmed);
  const isFast = /(quickly|hurry|as fast as|right away|immediately)/i.test(trimmed);

  if (isSarcastic) next = addTagAfterSpeakerPrefix(next, "[sarcasm]");
  else if (isWhisper) next = addTagAfterSpeakerPrefix(next, "[whispering]");
  else if (isLoud) next = addTagAfterSpeakerPrefix(next, "[shouting]");
  else if (isLaughing) next = addTagAfterSpeakerPrefix(next, "[laughing]");
  else if (isSigh) next = addTagAfterSpeakerPrefix(next, "[sigh]");
  else if (isHesitation) next = addTagAfterSpeakerPrefix(next, "[uhm]");
  else if (isCheerful) next = addTagAfterSpeakerPrefix(next, "[cheerfully]");
  else if (isDramatic) next = addTagAfterSpeakerPrefix(next, "[dramatic]");
  else if (isFast) next = addTagAfterSpeakerPrefix(next, "[fast]");

  return next.replace(/\s{2,}/g, " ").trimEnd();
}

function addFallbackExpression(prompt: string) {
  const withSentencePauses = prompt.replace(
    /([.!?])\s+(?=(?:[A-Za-z0-9]+:\s*)?["'A-Za-z0-9])/g,
    "$1 [short pause] ",
  );
  if (withSentencePauses !== prompt) return withSentencePauses;

  const lines = prompt.split("\n");
  const firstMarkableLine = lines.findIndex(
    (line) => line.trim() && !hasLeadingAudioTag(line),
  );
  if (firstMarkableLine === -1) return prompt;

  lines[firstMarkableLine] = addTagAfterSpeakerPrefix(
    lines[firstMarkableLine],
    "[cheerfully]",
  );
  return lines.join("\n");
}

export function autoMarkupPrompt(prompt: string) {
  const marked = prompt
    .split("\n")
    .map((line) => autoMarkupLine(line))
    .join("\n");
  if (marked !== prompt) return marked;
  return addFallbackExpression(prompt);
}

/** Builds the default multi-speaker template based on configured aliases. */
export function buildMultiSpeakerTemplate(speakers: Speaker[]) {
  const a = speakers[0]?.speaker_id?.trim() || "Speaker1";
  const b = speakers[1]?.speaker_id?.trim() || "Speaker2";
  return `${a}: Hi! Ready to share the news?\n${b}: Absolutely — let's get to it.`;
}
