import { NextResponse } from "next/server";

import {
  createCustomVoiceFileName,
  convertSpeechToSpeech,
} from "@/lib/elevenlabs";
import {
  getFalErrorMessage,
  getFalErrorStatus,
  transformFalSpeechToSpeech,
} from "@/lib/fal-custom-voices";
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
    const formData = await request.formData();
    const voiceId = String(formData.get("voiceId") ?? "").trim();
    const audioFile = formData.get("audio");
    const settingsRaw = String(formData.get("settings") ?? "{}");
    const seedRaw = String(formData.get("seed") ?? "");

    if (!voiceId || !(audioFile instanceof File) || audioFile.size === 0) {
      return errorResponse(
        400,
        "VOICE_CHANGER_REQUIRED",
        "Target voice and source audio are required.",
      );
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    if (localVoice?.provider === "fal") {
      if (!localVoice.previewUrl) {
        return errorResponse(
          400,
          "VOICE_REFERENCE_REQUIRED",
          "This cloned voice needs a preview reference before it can transform audio.",
        );
      }

      const result = await transformFalSpeechToSpeech({
        sourceAudio: audioFile,
        targetVoiceAudioUrl: localVoice.previewUrl,
      });
      const fileName =
        result.audio.file_name ??
        createCustomVoiceFileName(
          localVoice.name ?? "custom-voice",
          "transform",
        ).replace(/\.mp3$/i, ".wav");

      return NextResponse.json({
        audio: result.audio,
        requestId: result.requestId,
        fileName,
      });
    }

    const audio = await convertSpeechToSpeech({
      voiceId,
      audio: audioFile,
      outputFormat: String(formData.get("outputFormat") ?? "mp3_44100_128"),
      removeBackgroundNoise:
        String(formData.get("removeBackgroundNoise") ?? "") === "true",
      seed: seedRaw ? Number(seedRaw) : undefined,
      settings: JSON.parse(settingsRaw) as Partial<ElevenLabsVoiceSettings>,
    });
    const fileName = createCustomVoiceFileName(
      localVoice?.name ?? "custom-voice",
      "transform",
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
    const status = getFalErrorStatus(error);
    return errorResponse(
      status,
      "CUSTOM_VOICE_TRANSFORM_FAILED",
      getFalErrorMessage(error, "Voice transform failed."),
    );
  }
}
