export const MAX_PROMPT_CHARACTERS = 3000;
export const LONG_SCRIPT_WARNING_CHARACTERS = 3000;
export const MAX_STYLE_INSTRUCTIONS_CHARACTERS = 1000;

// Local persistence caps
export const MAX_STORED_SCRIPTS = 20;
export const MAX_STORED_GENERATIONS = 30;
export const MAX_INLINE_AUDIO_BYTES = 4 * 1024 * 1024; // 4 MB — anything larger we won't try to base64 into localStorage

// UI text length caps
export const MAX_SCRIPT_TITLE_LENGTH = 48;
export const MAX_VOICE_NAME_LENGTH = 80;
export const MAX_VOICE_DESCRIPTION_LENGTH = 500;

// Voice deletion / status toast
export const STATUS_TOAST_DURATION_MS = 3500;

// Accent strength label thresholds (slider 0–100). Each entry covers up to `max`.
export const ACCENT_STRENGTH_TIERS: ReadonlyArray<{ max: number; label: string }> = [
  { max: 5, label: "Neutral" },
  { max: 30, label: "Light" },
  { max: 65, label: "Balanced" },
  { max: 90, label: "Strong" },
  { max: 100, label: "Very strong" },
];

// Server-side upload caps. Generous enough for a clear sample, strict enough to
// avoid memory exhaustion or absurdly long clones.
export const MAX_REFERENCE_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
export const MAX_SOURCE_AUDIO_BYTES = 50 * 1024 * 1024;    // 50 MB
export const MAX_VOICE_SAMPLE_BYTES = 25 * 1024 * 1024;    // 25 MB per sample (clone)
export const MAX_VOICE_SAMPLE_COUNT = 25;                   // matches ElevenLabs cap

// Custom-voice speech max length. ElevenLabs accepts 5000 chars reliably across
// models; lower the previous 40k cap so users get a clear validation error
// before the provider call instead of an opaque rejection.
export const MAX_CUSTOM_VOICE_SPEECH_CHARS = 5000;
