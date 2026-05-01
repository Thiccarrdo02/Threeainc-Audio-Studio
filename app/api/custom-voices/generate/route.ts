import { NextResponse } from "next/server";

import {
  createElevenLabsFileName,
  createSpeech,
} from "@/lib/elevenlabs";
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

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const voiceId = String(body.voiceId ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!voiceId || !text) {
      return errorResponse(
        400,
        "CUSTOM_TTS_REQUIRED",
        "Voice ID and text are required.",
      );
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    const audio = await createSpeech({
      voiceId,
      text,
      modelId: String(body.modelId ?? "eleven_multilingual_v2"),
      languageCode: body.languageCode ? String(body.languageCode) : undefined,
      outputFormat: String(body.outputFormat ?? "mp3_44100_128"),
      seed: optionalNumber(body.seed),
      settings: body.settings as Partial<ElevenLabsVoiceSettings> | undefined,
    });
    const fileName = createElevenLabsFileName(
      localVoice?.name ?? "custom-voice",
      "tts",
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
      "ELEVENLABS_TTS_FAILED",
      error instanceof Error ? error.message : "Custom voice generation failed.",
    );
  }
}
