"use client";

import {
  DEFAULT_ELEVENLABS_SETTINGS,
  type CustomVoiceProfile,
  type CustomVoiceSource,
} from "@/types/custom-voices";

const RECENT_VOICES_KEY = "threezinc-audio.recent-voices.v1";
const PINNED_VOICES_KEY = "threezinc-audio.pinned-voices.v1";
const MAX_RECENTS = 8;

export type LibraryKind = "builtin" | "custom";

export interface VoiceRef {
  kind: LibraryKind;
  id: string;
}

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors
  }
}

export function loadRecentVoices(): VoiceRef[] {
  return readJson<VoiceRef[]>(RECENT_VOICES_KEY, []);
}

export function recordRecentVoice(ref: VoiceRef) {
  const current = loadRecentVoices().filter(
    (item) => !(item.kind === ref.kind && item.id === ref.id),
  );
  const next = [ref, ...current].slice(0, MAX_RECENTS);
  writeJson(RECENT_VOICES_KEY, next);
  return next;
}

export function loadPinnedVoices(): VoiceRef[] {
  return readJson<VoiceRef[]>(PINNED_VOICES_KEY, []);
}

export function togglePinnedVoice(ref: VoiceRef) {
  const current = loadPinnedVoices();
  const exists = current.some(
    (item) => item.kind === ref.kind && item.id === ref.id,
  );
  const next = exists
    ? current.filter((item) => !(item.kind === ref.kind && item.id === ref.id))
    : [ref, ...current];
  writeJson(PINNED_VOICES_KEY, next);
  return next;
}

export function isVoicePinned(refs: VoiceRef[], ref: VoiceRef) {
  return refs.some((item) => item.kind === ref.kind && item.id === ref.id);
}

const BUILTIN_SOURCES: CustomVoiceSource[] = ["voice-library"];

/**
 * A custom-voice profile belongs to "Built-in" if it was imported from the
 * shared ElevenLabs library. Otherwise it's user-created — Custom.
 */
export function isCustomVoiceBuiltin(voice: CustomVoiceProfile) {
  return BUILTIN_SOURCES.includes(voice.source);
}

export function partitionCustomVoices(voices: CustomVoiceProfile[]) {
  const builtin: CustomVoiceProfile[] = [];
  const custom: CustomVoiceProfile[] = [];
  for (const voice of voices) {
    if (isCustomVoiceBuiltin(voice)) {
      builtin.push(voice);
    } else {
      custom.push(voice);
    }
  }
  return { builtin, custom };
}

export function customVoiceTones(voice: CustomVoiceProfile): string[] {
  const tones: string[] = [];
  if (voice.labels?.accent) tones.push(voice.labels.accent);
  if (voice.labels?.use_case) tones.push(voice.labels.use_case);
  if (voice.labels?.gender) tones.push(voice.labels.gender);
  return tones.filter(Boolean);
}

export interface SharedLibraryVoice {
  publicOwnerId: string;
  voiceId: string;
  name: string;
  description: string;
  accent?: string;
  gender?: string;
  age?: string;
  useCase?: string;
  language?: string;
  previewUrl?: string;
}

/**
 * Convert a shared library voice (fetched from the catalog API) into the same
 * shape as a saved custom voice so the picker can render it inline. We keep
 * source = "voice-library" so the picker partitions it into the Built-in tab.
 *
 * The picker calls the standard custom-voice TTS endpoint with this voice's
 * id, which works against any voice id (not only ones we've previously saved).
 */
export function libraryVoiceToProfile(
  voice: SharedLibraryVoice,
): CustomVoiceProfile {
  const labels: Record<string, string> = {};
  if (voice.accent) labels.accent = voice.accent;
  if (voice.gender) labels.gender = voice.gender;
  if (voice.useCase) labels.use_case = voice.useCase;
  if (voice.language) labels.language = voice.language;
  if (voice.age) labels.age = voice.age;
  return {
    id: `library_${voice.voiceId}`,
    provider: "elevenlabs",
    voiceId: voice.voiceId,
    name: voice.name,
    description: voice.description,
    source: "voice-library",
    previewUrl: voice.previewUrl,
    labels,
    settings: DEFAULT_ELEVENLABS_SETTINGS,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  };
}

/**
 * Merge two voice profile lists, removing duplicates by voiceId. Items from
 * `primary` win over items from `secondary` for the same id.
 */
export function mergeVoiceProfiles(
  primary: CustomVoiceProfile[],
  secondary: CustomVoiceProfile[],
): CustomVoiceProfile[] {
  const seen = new Set(primary.map((voice) => voice.voiceId));
  const merged: CustomVoiceProfile[] = [...primary];
  for (const voice of secondary) {
    if (seen.has(voice.voiceId)) continue;
    merged.push(voice);
    seen.add(voice.voiceId);
  }
  return merged;
}

/**
 * Maps a language code to the preview language we have static MP3s for.
 * Hindi/Bangla/Marathi/Tamil/etc. → "hindi" (the closest non-English preview).
 */
export function previewLanguageForCode(
  languageCode: string | undefined,
): "english" | "hindi" {
  if (!languageCode || languageCode === "auto") return "english";
  if (languageCode.startsWith("en-")) return "english";
  // Indian-subcontinent languages share the Hindi preview asset
  if (
    languageCode === "hi-IN" ||
    languageCode === "mr-IN" ||
    languageCode === "ta-IN" ||
    languageCode === "te-IN" ||
    languageCode === "gu-IN" ||
    languageCode === "kn-IN" ||
    languageCode === "ml-IN" ||
    languageCode === "pa-IN" ||
    languageCode === "bn-BD"
  ) {
    return "hindi";
  }
  return "english";
}
