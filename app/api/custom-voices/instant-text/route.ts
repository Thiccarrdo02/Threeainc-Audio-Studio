import { NextResponse } from "next/server";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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
        "VOICE_DIRECTION_TOO_SHORT",
        "Describe the reference voice in at least 20 characters.",
      );
    }

    if (text.length < 100 || text.length > 1000) {
      return errorResponse(
        400,
        "INSTANT_TEXT_LENGTH_INVALID",
        "Target text must be between 100 and 1000 characters.",
      );
    }

    const result = await instantTextVoicePreviews({
      description,
      text,
      referenceAudio,
      outputFormat: String(formData.get("outputFormat") ?? "mp3_44100_128"),
      promptStrength: clamp(optionalNumber(formData.get("promptStrength")), 0, 1),
      loudness: clamp(optionalNumber(formData.get("loudness")), -1, 1),
      guidanceScale: clamp(optionalNumber(formData.get("guidanceScale")), 0, 100),
      seed: optionalNumber(formData.get("seed")),
    });

    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      502,
      "REFERENCE_VOICE_TEXT_FAILED",
      error instanceof Error
        ? error.message
        : "Reference voice generation failed.",
    );
  }
}
