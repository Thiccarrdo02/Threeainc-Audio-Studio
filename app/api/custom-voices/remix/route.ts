import { remixVoicePreviews } from "@/lib/elevenlabs";
import { getCustomVoiceByProviderId } from "@/lib/local-custom-voices";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const voiceId = String(body.voiceId ?? "").trim();
    const description = String(body.description ?? "").trim();
    const promptStrength =
      typeof body.promptStrength === "number" ? body.promptStrength : 0.5;

    if (!voiceId || description.length < 5) {
      return jsonError({
        status: 400,
        code: "VOICE_REMIX_REQUIRED",
        message: "Voice ID and remix direction are required.",
      });
    }

    const localVoice = await getCustomVoiceByProviderId(voiceId);
    if (localVoice?.provider === "fal") {
      return jsonError({
        status: 400,
        code: "VOICE_REMIX_TARGET_UNSUPPORTED",
        message:
          "Uploaded instant clones can generate typed speech. Remix needs a created or imported library voice.",
      });
    }

    const result = await remixVoicePreviews({
      voiceId,
      description,
      promptStrength,
    });
    return Response.json(result);
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_REMIX_FAILED",
      message: getErrorMessage(error, "Voice remix failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/remix");
