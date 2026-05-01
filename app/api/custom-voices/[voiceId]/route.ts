import { NextResponse } from "next/server";

import { deleteElevenLabsVoice } from "@/lib/elevenlabs";
import { removeCustomVoice } from "@/lib/local-custom-voices";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await context.params;
  if (!voiceId) {
    return errorResponse(400, "VOICE_ID_REQUIRED", "Voice ID is required.");
  }

  try {
    await deleteElevenLabsVoice(voiceId);
    await removeCustomVoice(voiceId);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return errorResponse(
      502,
      "ELEVENLABS_DELETE_FAILED",
      error instanceof Error ? error.message : "Could not delete custom voice.",
    );
  }
}
