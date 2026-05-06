import { NextResponse } from "next/server";

import { createCustomVoiceFileName, createSpeech } from "@/lib/elevenlabs";
import { getCustomVoiceByProviderId } from "@/lib/local-custom-voices";
import type { ElevenLabsVoiceSettings } from "@/types/custom-voices";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: {
      code,
      message,
      retryable: status >= 500,
    },
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const voiceId = String(body.voiceId ?? "").trim();
    const text = String(body.text ?? "").trim();
    const settings = (body.settings ?? {}) as Partial<ElevenLabsVoiceSettings>;
    const seed =
      typeof body.seed === "number" && Number.isFinite(body.seed)
        ? body.seed
        : undefined;

    if (!voiceId || text.length < 1 || text.length > 40000) {
      return errorResponse(
        400,
        "CUSTOM_VOICE_SPEECH_REQUIRED",
        "Select a saved voice and enter text to generate.",
      );
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    const audio = await createSpeech({
      voiceId,
      text,
      outputFormat: String(body.outputFormat ?? "mp3_44100_128"),
      seed,
      settings,
    });
    const fileName = createCustomVoiceFileName(
      localVoice?.name ?? "custom-voice",
      "speech",
    );

    return new NextResponse(audio.bytes, {
      headers: {
        "Content-Type": audio.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-ThreeZinc-File-Name": fileName,
        "X-ThreeZinc-Request-Id": audio.requestId ?? "",
      },
    });
  } catch (error) {
    return errorResponse(
      502,
      "CUSTOM_VOICE_SPEECH_FAILED",
      error instanceof Error ? error.message : "Custom voice generation failed.",
    );
  }
}
