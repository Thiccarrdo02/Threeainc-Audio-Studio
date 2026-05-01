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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const description = String(body.description ?? "").trim();
    if (description.length < 20) {
      return errorResponse(
        400,
        "VOICE_DESCRIPTION_TOO_SHORT",
        "Voice design description must be at least 20 characters.",
      );
    }

    const result = await designVoicePreviews(description);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      502,
      "ELEVENLABS_DESIGN_FAILED",
      error instanceof Error ? error.message : "Voice design failed.",
    );
  }
}
