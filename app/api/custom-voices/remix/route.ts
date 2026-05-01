import { NextResponse } from "next/server";

import { remixVoicePreviews } from "@/lib/elevenlabs";
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
    const body = (await request.json()) as Record<string, unknown>;
    const voiceId = String(body.voiceId ?? "").trim();
    const description = String(body.description ?? "").trim();
    const promptStrength =
      typeof body.promptStrength === "number" ? body.promptStrength : 0.5;

    if (!voiceId || description.length < 5) {
      return errorResponse(
        400,
        "VOICE_REMIX_REQUIRED",
        "Voice ID and remix direction are required.",
      );
    }

    const result = await remixVoicePreviews({
      voiceId,
      description,
      promptStrength,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      502,
      "ELEVENLABS_REMIX_FAILED",
      error instanceof Error ? error.message : "Voice remix failed.",
    );
  }
}
