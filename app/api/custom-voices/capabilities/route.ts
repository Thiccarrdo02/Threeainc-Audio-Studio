import { getCachedCustomVoiceSubscription } from "@/lib/elevenlabs-cache";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

async function handleGet() {
  try {
    const subscription = await getCachedCustomVoiceSubscription();
    return Response.json({
      canUseInstantVoiceCloning: subscription.canUseInstantVoiceCloning,
      canUseProfessionalVoiceCloning: subscription.canUseProfessionalVoiceCloning,
      voiceSlotsUsed: subscription.voiceSlotsUsed,
      voiceLimit: subscription.voiceLimit,
    });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_CAPABILITIES_FAILED",
      message: getErrorMessage(error, "Could not load custom voice account capabilities."),
    });
  }
}

export const GET = withRequestLogging(handleGet, "GET /api/custom-voices/capabilities");
