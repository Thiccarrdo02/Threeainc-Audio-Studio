import { NextResponse } from "next/server";

import { designVoicePreviews } from "@/lib/elevenlabs";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number") {
    return undefined;
  }
  return Math.min(max, Math.max(min, value));
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const description = String(body.description ?? "").trim();
    if (description.length < 20) {
      return errorResponse(
        400,
        "VOICE_DESCRIPTION_TOO_SHORT",
        "Create voice description must be at least 20 characters.",
      );
    }

    const result = await designVoicePreviews({
      description,
      loudness: clamp(optionalNumber(body.loudness), -1, 1),
      quality: clamp(optionalNumber(body.quality), -1, 1),
      guidanceScale: clamp(optionalNumber(body.guidanceScale), 0, 100),
      seed: optionalNumber(body.seed),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      502,
      "CUSTOM_VOICE_CREATE_FAILED",
      error instanceof Error ? error.message : "Create voice failed.",
    );
  }
}
