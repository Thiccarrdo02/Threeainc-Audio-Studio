import { NextResponse } from "next/server";

import {
  saveGeneratedVoice,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import type { CustomVoiceSource } from "@/types/custom-voices";
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
    const generatedVoiceId = String(body.generatedVoiceId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const source = String(body.source ?? "voice-design") as CustomVoiceSource;

    if (!generatedVoiceId || !name || description.length < 20) {
      return errorResponse(
        400,
        "GENERATED_VOICE_REQUIRED",
        "Generated voice ID, name, and description are required.",
      );
    }

    const created = await saveGeneratedVoice({
      generatedVoiceId,
      name,
      description,
      source,
    });
    const stored = await upsertCustomVoice(
      voiceToStoredProfile(created, source, { name, description }),
    );

    return NextResponse.json({ voice: stored });
  } catch (error) {
    return errorResponse(
      502,
      "ELEVENLABS_SAVE_GENERATED_FAILED",
      error instanceof Error ? error.message : "Could not save generated voice.",
    );
  }
}
