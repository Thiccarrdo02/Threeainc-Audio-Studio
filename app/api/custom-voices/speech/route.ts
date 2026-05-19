import {
  createCustomVoiceFileName,
  createSpeech,
  sanitizeTextForCustomVoice,
} from "@/lib/elevenlabs";
import {
  createFalSpeech,
  getFalErrorMessage,
  getFalErrorStatus,
} from "@/lib/fal-custom-voices";
import { getCustomVoiceByProviderId } from "@/lib/local-custom-voices";
import { jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import { MAX_CUSTOM_VOICE_SPEECH_CHARS } from "@/config/limits";
import type { ElevenLabsVoiceSettings } from "@/types/custom-voices";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const voiceId = String(body.voiceId ?? "").trim();
    const text = String(body.text ?? "").trim();
    const settings = (body.settings ?? {}) as Partial<ElevenLabsVoiceSettings>;
    const seed =
      typeof body.seed === "number" && Number.isFinite(body.seed)
        ? body.seed
        : undefined;

    if (!voiceId || text.length < 1) {
      return jsonError({
        status: 400,
        code: "CUSTOM_VOICE_SPEECH_REQUIRED",
        message: "Select a saved voice and enter text to generate.",
      });
    }

    if (text.length > MAX_CUSTOM_VOICE_SPEECH_CHARS) {
      return jsonError({
        status: 400,
        code: "CUSTOM_VOICE_SPEECH_TOO_LONG",
        message: `Custom voice text must be ${MAX_CUSTOM_VOICE_SPEECH_CHARS} characters or fewer.`,
      });
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    const fileName = createCustomVoiceFileName(
      localVoice?.name ?? "custom-voice",
      "speech",
    );
    const cleanedText = sanitizeTextForCustomVoice(text);

    if (localVoice?.provider === "fal") {
      const audio = await createFalSpeech({
        voiceId,
        text: cleanedText,
        speed: settings.speed,
      });
      return Response.json({
        audio: audio.audio,
        requestId: audio.requestId,
        fileName,
      });
    }

    const audio = await createSpeech({
      voiceId,
      text: cleanedText,
      outputFormat: String(body.outputFormat ?? "mp3_44100_128"),
      seed,
      settings,
    });

    return new Response(audio.bytes, {
      headers: {
        "Content-Type": audio.contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "X-ThreeZinc-File-Name": fileName,
        "X-ThreeZinc-Request-Id": audio.requestId ?? "",
      },
    });
  } catch (error) {
    const status = getFalErrorStatus(error);
    return jsonError({
      status,
      code: "CUSTOM_VOICE_SPEECH_FAILED",
      message: getFalErrorMessage(error, "Custom voice generation failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/speech");
