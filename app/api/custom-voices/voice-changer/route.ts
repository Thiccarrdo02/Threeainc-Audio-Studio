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
import { jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import { MAX_SOURCE_AUDIO_BYTES } from "@/config/limits";
import type { ElevenLabsVoiceSettings } from "@/types/custom-voices";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const formData = await request.formData();
    const voiceId = String(formData.get("voiceId") ?? "").trim();
    const audioFile = formData.get("audio");
    const settingsRaw = String(formData.get("settings") ?? "{}");
    const seedRaw = String(formData.get("seed") ?? "");

    if (!voiceId || !(audioFile instanceof File) || audioFile.size === 0) {
      return jsonError({
        status: 400,
        code: "VOICE_CHANGER_REQUIRED",
        message: "Target voice and source audio are required.",
      });
    }

    if (audioFile.size > MAX_SOURCE_AUDIO_BYTES) {
      return jsonError({
        status: 413,
        code: "VOICE_CHANGER_SOURCE_TOO_LARGE",
        message: `Source audio must be smaller than ${Math.round(
          MAX_SOURCE_AUDIO_BYTES / 1024 / 1024,
        )} MB.`,
      });
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    if (localVoice?.provider === "fal") {
      if (!localVoice.previewUrl) {
        return jsonError({
          status: 400,
          code: "VOICE_REFERENCE_REQUIRED",
          message: "This cloned voice needs a preview reference before it can transform audio.",
        });
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

      return Response.json({
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

    return new Response(audio.bytes, {
      headers: {
        "Content-Type": audio.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-ThreeZinc-File-Name": fileName,
        "X-ThreeZinc-Request-Id": audio.requestId ?? "",
      },
    });
  } catch (error) {
    return jsonError({
      status: getFalErrorStatus(error),
      code: "CUSTOM_VOICE_TRANSFORM_FAILED",
      message: getFalErrorMessage(error, "Voice transform failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/voice-changer");
