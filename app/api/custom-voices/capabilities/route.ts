import { NextResponse } from "next/server";

import { getCustomVoiceSubscription } from "@/lib/elevenlabs";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 30;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

export async function GET() {
  try {
    const subscription = await getCustomVoiceSubscription();
    return NextResponse.json({
      canUseInstantVoiceCloning: subscription.canUseInstantVoiceCloning,
      canUseProfessionalVoiceCloning: subscription.canUseProfessionalVoiceCloning,
      voiceSlotsUsed: subscription.voiceSlotsUsed,
      voiceLimit: subscription.voiceLimit,
    });
  } catch (error) {
    return errorResponse(
      502,
      "CUSTOM_VOICE_CAPABILITIES_FAILED",
      error instanceof Error
        ? error.message
        : "Could not load custom voice account capabilities.",
    );
  }
}
