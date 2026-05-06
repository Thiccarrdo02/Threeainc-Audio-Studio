import { NextResponse } from "next/server";

import {
  addSharedVoiceToLibrary,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const publicOwnerId = String(body.publicOwnerId ?? "").trim();
    const voiceId = String(body.voiceId ?? "").trim();
    const name = String(body.name ?? "Library voice").trim();
    const description = String(body.description ?? "").trim();
    const previewUrl = String(body.previewUrl ?? "").trim();

    if (!publicOwnerId || !voiceId || !name) {
      return errorResponse(
        400,
        "VOICE_LIBRARY_IMPORT_REQUIRED",
        "Voice library owner, voice ID, and name are required.",
      );
    }

    const created = await addSharedVoiceToLibrary({
      publicOwnerId,
      voiceId,
      name,
    });
    const stored = await upsertCustomVoice({
      ...voiceToStoredProfile(
        {
          voice_id: created.voice_id,
          name,
          description,
          preview_url: previewUrl || undefined,
        },
        "voice-library",
        {
          name,
          description: description || "Imported voice library voice.",
        },
      ),
      previewUrl: previewUrl || undefined,
    });

    return NextResponse.json({ voice: stored });
  } catch (error) {
    return errorResponse(
      502,
      "VOICE_LIBRARY_IMPORT_FAILED",
      error instanceof Error ? error.message : "Could not import voice.",
    );
  }
}
