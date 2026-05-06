import { NextResponse } from "next/server";

import {
  createFalInstantClone,
  toFalMiniMaxCloneModel,
} from "@/lib/fal-custom-voices";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import { DEFAULT_ELEVENLABS_SETTINGS } from "@/types/custom-voices";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const referenceAudio = formData.get("referenceAudio");
    const text = String(formData.get("text") ?? "").trim();
    const voiceName = String(formData.get("voiceName") ?? "Instant clone").trim();
    const description = String(
      formData.get("description") ??
        "Uploaded reference voice cloned for local custom speech.",
    ).trim();

    if (!(referenceAudio instanceof File) || referenceAudio.size === 0) {
      return errorResponse(
        400,
        "REFERENCE_AUDIO_REQUIRED",
        "Upload one clear reference voice sample.",
      );
    }

    if (text.length < 1 || text.length > 5000) {
      return errorResponse(
        400,
        "INSTANT_CLONE_TEXT_INVALID",
        "Text must be between 1 and 5000 characters.",
      );
    }

    const result = await createFalInstantClone({
      referenceAudio,
      text,
      model: toFalMiniMaxCloneModel(String(formData.get("model") ?? "")),
      noiseReduction: String(formData.get("noiseReduction") ?? "true") === "true",
      volumeNormalization:
        String(formData.get("volumeNormalization") ?? "true") === "true",
    });

    const voice = await upsertCustomVoice({
      provider: "fal",
      voiceId: result.customVoiceId,
      name: voiceName || "Instant clone",
      description,
      source: "instant-clone",
      previewUrl: result.audio.url,
      labels: {
        source: "instant-clone",
      },
      settings: DEFAULT_ELEVENLABS_SETTINGS,
    });

    return NextResponse.json({
      voice,
      audio: result.audio,
      requestId: result.requestId,
    });
  } catch (error) {
    return errorResponse(
      502,
      "INSTANT_CLONE_FAILED",
      error instanceof Error ? error.message : "Instant clone failed.",
    );
  }
}
