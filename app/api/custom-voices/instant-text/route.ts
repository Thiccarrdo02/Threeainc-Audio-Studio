import { instantTextVoicePreviews } from "@/lib/elevenlabs";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import { MAX_REFERENCE_AUDIO_BYTES } from "@/config/limits";

export const runtime = "nodejs";
export const maxDuration = 120;

function optionalNumber(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function clamp(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number") return undefined;
  return Math.min(max, Math.max(min, value));
}

async function handlePost(request: Request) {
  try {
    const formData = await request.formData();
    const description = String(formData.get("description") ?? "").trim();
    const text = String(formData.get("text") ?? "").trim();
    const referenceAudio = formData.get("referenceAudio");

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

    if (description.length < 20) {
      return jsonError({
        status: 400,
        code: "VOICE_DIRECTION_TOO_SHORT",
        message: "Describe the reference voice in at least 20 characters.",
      });
    }

    if (text.length < 100 || text.length > 1000) {
      return jsonError({
        status: 400,
        code: "INSTANT_TEXT_LENGTH_INVALID",
        message: "Target text must be between 100 and 1000 characters.",
      });
    }

    const result = await instantTextVoicePreviews({
      description,
      text,
      referenceAudio,
      outputFormat: String(formData.get("outputFormat") ?? "mp3_44100_128"),
      promptStrength: clamp(optionalNumber(formData.get("promptStrength")), 0, 1),
      loudness: clamp(optionalNumber(formData.get("loudness")), -1, 1),
      guidanceScale: clamp(optionalNumber(formData.get("guidanceScale")), 0, 100),
      seed: optionalNumber(formData.get("seed")),
    });

    return Response.json(result);
  } catch (error) {
    return jsonError({
      status: 502,
      code: "REFERENCE_VOICE_TEXT_FAILED",
      message: getErrorMessage(error, "Reference voice generation failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/instant-text");
