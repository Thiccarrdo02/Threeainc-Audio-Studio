import {
  addInstantCloneVoice,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { getCachedCustomVoiceSubscription } from "@/lib/elevenlabs-cache";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import {
  MAX_VOICE_DESCRIPTION_LENGTH,
  MAX_VOICE_NAME_LENGTH,
  MAX_VOICE_SAMPLE_BYTES,
  MAX_VOICE_SAMPLE_COUNT,
} from "@/config/limits";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim().slice(0, MAX_VOICE_NAME_LENGTH);
    const description = String(formData.get("description") ?? "")
      .trim()
      .slice(0, MAX_VOICE_DESCRIPTION_LENGTH);
    const consent = String(formData.get("consent") ?? "") === "true";
    const removeBackgroundNoise =
      String(formData.get("removeBackgroundNoise") ?? "") === "true";
    const labelsRaw = String(formData.get("labels") ?? "{}");
    const labels = Object.fromEntries(
      Object.entries(JSON.parse(labelsRaw) as Record<string, unknown>)
        .map(([key, value]) => [key, String(value ?? "").trim()])
        .filter(([, value]) => value.length > 0),
    );
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!consent) {
      return jsonError({
        status: 400,
        code: "VOICE_CONSENT_REQUIRED",
        message: "Confirm that you own this voice or have permission to clone it.",
      });
    }

    if (!name || description.length < 10) {
      return jsonError({
        status: 400,
        code: "VOICE_DETAILS_REQUIRED",
        message: "Voice name and description are required.",
      });
    }

    if (files.length === 0) {
      return jsonError({
        status: 400,
        code: "VOICE_SAMPLE_REQUIRED",
        message: "Upload at least one voice sample.",
      });
    }

    if (files.length > MAX_VOICE_SAMPLE_COUNT) {
      return jsonError({
        status: 400,
        code: "VOICE_SAMPLE_TOO_MANY",
        message: `Upload up to ${MAX_VOICE_SAMPLE_COUNT} samples per voice.`,
      });
    }

    const oversized = files.find((file) => file.size > MAX_VOICE_SAMPLE_BYTES);
    if (oversized) {
      return jsonError({
        status: 413,
        code: "VOICE_SAMPLE_TOO_LARGE",
        message: `Each voice sample must be smaller than ${Math.round(
          MAX_VOICE_SAMPLE_BYTES / 1024 / 1024,
        )} MB.`,
      });
    }

    const subscription = await getCachedCustomVoiceSubscription();
    if (!subscription.canUseInstantVoiceCloning) {
      return jsonError({
        status: 403,
        code: "CUSTOM_VOICE_CLONE_NOT_ENABLED",
        message:
          "Instant cloning is not enabled on this account yet. Use Instant Voice or Create Voice to make saved voices, or upgrade the voice account plan to enable cloning.",
      });
    }

    const created = await addInstantCloneVoice({
      name,
      description,
      files,
      removeBackgroundNoise,
      labels,
    });
    const profile = voiceToStoredProfile(
      { voice_id: created.voice_id, name, description },
      "instant-clone",
      { name, description },
    );
    const stored = await upsertCustomVoice({
      ...profile,
      labels: { ...profile.labels, ...labels },
    });

    return Response.json({ voice: stored });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_CLONE_FAILED",
      message: getErrorMessage(error, "Voice cloning failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/clone");
