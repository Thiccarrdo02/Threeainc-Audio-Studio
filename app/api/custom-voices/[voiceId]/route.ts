import { NextResponse } from "next/server";

import { deleteElevenLabsVoice } from "@/lib/elevenlabs";
import {
  getCustomVoiceByProviderId,
  removeCustomVoice,
  updateCustomVoiceMetadata,
} from "@/lib/local-custom-voices";
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
    const existing = await getCustomVoiceByProviderId(voiceId);
    if (!existing || existing.provider === "elevenlabs") {
      await deleteElevenLabsVoice(voiceId);
    }
    await removeCustomVoice(voiceId);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    return errorResponse(
      502,
      "CUSTOM_VOICE_DELETE_FAILED",
      error instanceof Error ? error.message : "Could not delete custom voice.",
    );
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ voiceId: string }> },
) {
  const { voiceId } = await context.params;
  if (!voiceId) {
    return errorResponse(400, "VOICE_ID_REQUIRED", "Voice ID is required.");
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name =
      typeof body.name === "string" ? body.name.trim().slice(0, 80) : undefined;
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, 500)
        : undefined;

    if (name === "" || (name === undefined && description === undefined)) {
      return errorResponse(
        400,
        "VOICE_METADATA_REQUIRED",
        "A voice name or description is required.",
      );
    }

    const updated = await updateCustomVoiceMetadata(voiceId, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });

    if (!updated) {
      return errorResponse(404, "VOICE_NOT_FOUND", "Voice was not found.");
    }

    return NextResponse.json({ voice: updated });
  } catch (error) {
    return errorResponse(
      502,
      "CUSTOM_VOICE_UPDATE_FAILED",
      error instanceof Error ? error.message : "Could not update custom voice.",
    );
  }
}
