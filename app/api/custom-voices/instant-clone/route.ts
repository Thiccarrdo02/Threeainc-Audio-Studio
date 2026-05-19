import {
  createFalInstantClone,
  getFalErrorMessage,
  getFalErrorStatus,
  toFalMiniMaxCloneModel,
} from "@/lib/fal-custom-voices";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import { jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import {
  MAX_REFERENCE_AUDIO_BYTES,
  MAX_VOICE_DESCRIPTION_LENGTH,
  MAX_VOICE_NAME_LENGTH,
} from "@/config/limits";
import { DEFAULT_ELEVENLABS_SETTINGS } from "@/types/custom-voices";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const formData = await request.formData();
    const referenceAudio = formData.get("referenceAudio");
    const text = String(formData.get("text") ?? "").trim();
    const voiceName = String(formData.get("voiceName") ?? "Instant clone")
      .trim()
      .slice(0, MAX_VOICE_NAME_LENGTH);
    const description = String(
      formData.get("description") ??
        "Uploaded reference voice cloned for local custom speech.",
    )
      .trim()
      .slice(0, MAX_VOICE_DESCRIPTION_LENGTH);

    if (!(referenceAudio instanceof File) || referenceAudio.size === 0) {
      return jsonError({
        status: 400,
        code: "REFERENCE_AUDIO_REQUIRED",
        message: "Upload one clear reference voice sample.",
      });
    }

    if (referenceAudio.size > MAX_REFERENCE_AUDIO_BYTES) {
      return jsonError({
        status: 413,
        code: "REFERENCE_AUDIO_TOO_LARGE",
        message: `Reference audio must be smaller than ${Math.round(
          MAX_REFERENCE_AUDIO_BYTES / 1024 / 1024,
        )} MB.`,
      });
    }

    if (text.length < 1 || text.length > 5000) {
      return jsonError({
        status: 400,
        code: "INSTANT_CLONE_TEXT_INVALID",
        message: "Text must be between 1 and 5000 characters.",
      });
    }

    const result = await createFalInstantClone({
      referenceAudio,
      text,
      model: toFalMiniMaxCloneModel(String(formData.get("model") ?? "")),
      noiseReduction: String(formData.get("noiseReduction") ?? "true") === "true",
      volumeNormalization:
        String(formData.get("volumeNormalization") ?? "true") === "true",
    });

    const voice = await upsertCustomVoice({
      provider: "fal",
      voiceId: result.customVoiceId,
      name: voiceName || "Instant clone",
      description,
      source: "instant-clone",
      previewUrl: result.audio.url,
      labels: { source: "instant-clone" },
      settings: DEFAULT_ELEVENLABS_SETTINGS,
    });

    return Response.json({
      voice,
      audio: result.audio,
      requestId: result.requestId,
    });
  } catch (error) {
    return jsonError({
      status: getFalErrorStatus(error),
      code: "INSTANT_CLONE_FAILED",
      message: getFalErrorMessage(error, "Instant clone failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/instant-clone");
