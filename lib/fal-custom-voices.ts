import { fal } from "@fal-ai/client";

import { DEFAULT_ELEVENLABS_SETTINGS } from "@/types/custom-voices";

const FAL_MINIMAX_CLONE_MODEL = "fal-ai/minimax/voice-clone";
const FAL_MINIMAX_TTS_MODEL = "fal-ai/minimax/speech-02-hd";

export const FAL_MINIMAX_CLONE_MODELS = [
  "speech-02-hd",
  "speech-02-turbo",
  "speech-01-hd",
  "speech-01-turbo",
] as const;

export type FalMiniMaxCloneModel = (typeof FAL_MINIMAX_CLONE_MODELS)[number];

export interface FalAudioFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

export function toFalMiniMaxCloneModel(value: string): FalMiniMaxCloneModel {
  return FAL_MINIMAX_CLONE_MODELS.includes(value as FalMiniMaxCloneModel)
    ? (value as FalMiniMaxCloneModel)
    : "speech-02-hd";
}

function getFalKey() {
  const key = process.env.FAL_KEY;
  if (!key) {
    throw new Error("Voice clone key is not configured.");
  }
  return key;
}

function configureFal() {
  fal.config({ credentials: getFalKey() });
}

function isFalCloneOutput(value: unknown): value is {
  custom_voice_id: string;
  audio?: FalAudioFile;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const audio = candidate.audio as Record<string, unknown> | undefined;
  return (
    typeof candidate.custom_voice_id === "string" &&
    (!audio || typeof audio.url === "string")
  );
}

function isFalSpeechOutput(value: unknown): value is {
  audio: FalAudioFile;
  duration_ms?: number;
} {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const audio = candidate.audio as Record<string, unknown> | undefined;
  return Boolean(audio && typeof audio.url === "string");
}

export async function createFalInstantClone({
  referenceAudio,
  text,
  model,
  noiseReduction,
  volumeNormalization,
}: {
  referenceAudio: File;
  text: string;
  model: FalMiniMaxCloneModel;
  noiseReduction: boolean;
  volumeNormalization: boolean;
}) {
  configureFal();
  const audioUrl = await fal.storage.upload(referenceAudio);
  const result = await fal.subscribe(FAL_MINIMAX_CLONE_MODEL, {
    input: {
      audio_url: audioUrl,
      text,
      model,
      noise_reduction: noiseReduction,
      need_volume_normalization: volumeNormalization,
    },
    logs: true,
  });

  if (!isFalCloneOutput(result.data) || !result.data.audio?.url) {
    throw new Error("Instant clone returned an unexpected audio response.");
  }

  return {
    customVoiceId: result.data.custom_voice_id,
    audio: result.data.audio,
    requestId: result.requestId,
  };
}

export async function createFalSpeech({
  voiceId,
  text,
  speed = DEFAULT_ELEVENLABS_SETTINGS.speed,
}: {
  voiceId: string;
  text: string;
  speed?: number;
}) {
  configureFal();
  const result = await fal.subscribe(FAL_MINIMAX_TTS_MODEL, {
    input: {
      text,
      output_format: "url",
      voice_setting: {
        voice_id: voiceId,
        speed,
      },
    },
    logs: true,
  });

  if (!isFalSpeechOutput(result.data)) {
    throw new Error("Custom voice speech returned an unexpected audio response.");
  }

  return {
    audio: result.data.audio,
    durationMs: result.data.duration_ms,
    requestId: result.requestId,
  };
}
