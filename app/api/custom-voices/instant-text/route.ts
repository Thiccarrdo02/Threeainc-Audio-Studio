import { NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

import { instantTextVoicePreviews } from "@/lib/elevenlabs";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number") {
    return undefined;
  }
  return Math.min(max, Math.max(min, value));
}

const FAL_MINIMAX_MODELS = [
  "speech-02-hd",
  "speech-02-turbo",
  "speech-01-hd",
  "speech-01-turbo",
] as const;

type FalMiniMaxModel = (typeof FAL_MINIMAX_MODELS)[number];

function toFalMiniMaxModel(value: string): FalMiniMaxModel {
  return FAL_MINIMAX_MODELS.includes(value as FalMiniMaxModel)
    ? (value as FalMiniMaxModel)
    : "speech-02-hd";
}

function isFalCloneOutput(value: unknown): value is {
  custom_voice_id: string;
  audio?: { url?: string; content_type?: string; file_name?: string };
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

async function generateWithFal({
  referenceAudio,
  text,
  noiseReduction,
  volumeNormalization,
  model,
}: {
  referenceAudio: File;
  text: string;
  noiseReduction: boolean;
  volumeNormalization: boolean;
  model: FalMiniMaxModel;
}) {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not configured on this server.");
  }

  fal.config({ credentials: falKey });
  const audioUrl = await fal.storage.upload(referenceAudio);
  const result = await fal.subscribe("fal-ai/minimax/voice-clone", {
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
    throw new Error("Fal returned an unexpected voice clone response.");
  }

  return {
    text,
    previews: [
      {
        id: `fal_preview_${result.requestId}`,
        generatedVoiceId: result.data.custom_voice_id,
        audioUrl: result.data.audio.url,
        mediaType: result.data.audio.content_type ?? "audio/mpeg",
        provider: "fal" as const,
        text,
      },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const provider = String(formData.get("provider") ?? "fal-minimax");
    const description = String(formData.get("description") ?? "").trim();
    const text = String(formData.get("text") ?? "").trim();
    const referenceAudio = formData.get("referenceAudio");

    if (!(referenceAudio instanceof File) || referenceAudio.size === 0) {
      return errorResponse(
        400,
        "REFERENCE_AUDIO_REQUIRED",
        "Upload one clear reference voice sample.",
      );
    }

    if (description.length < 20) {
      return errorResponse(
        400,
        "VOICE_DESCRIPTION_TOO_SHORT",
        "Describe the reference voice in at least 20 characters.",
      );
    }

    const minimumTextLength = provider === "fal-minimax" ? 1 : 100;
    if (text.length < minimumTextLength || text.length > 1000) {
      return errorResponse(
        400,
        "INSTANT_TEXT_LENGTH_INVALID",
        provider === "fal-minimax"
          ? "Target text is required and must be 1000 characters or fewer."
          : "Target text must be between 100 and 1000 characters for reference voice generation.",
      );
    }

    if (provider === "fal-minimax") {
      const result = await generateWithFal({
        referenceAudio,
        text,
        noiseReduction: String(formData.get("noiseReduction") ?? "true") === "true",
        volumeNormalization:
          String(formData.get("volumeNormalization") ?? "true") === "true",
        model: toFalMiniMaxModel(String(formData.get("falModel") ?? "")),
      });
      return NextResponse.json(result);
    }

    const result = await instantTextVoicePreviews({
      description,
      text,
      referenceAudio,
      outputFormat: String(formData.get("outputFormat") ?? "mp3_44100_128"),
      promptStrength: clamp(optionalNumber(formData.get("promptStrength")), 0, 1),
      loudness: clamp(optionalNumber(formData.get("loudness")), -1, 1),
      quality: clamp(optionalNumber(formData.get("quality")), -1, 1),
      guidanceScale: clamp(optionalNumber(formData.get("guidanceScale")), 0, 100),
      seed: optionalNumber(formData.get("seed")),
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return errorResponse(
      502,
      "REFERENCE_VOICE_TEXT_FAILED",
      message === "Unprocessable Entity"
        ? "Fal rejected the reference voice request. Use a clear voice sample at least 10 seconds long, then retry."
        : message || "Instant reference voice generation failed.",
    );
  }
}
