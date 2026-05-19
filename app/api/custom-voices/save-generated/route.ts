import {
  saveGeneratedVoice,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import type { CustomVoiceSource } from "@/types/custom-voices";

export const runtime = "nodejs";
export const maxDuration = 120;

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const generatedVoiceId = String(body.generatedVoiceId ?? "").trim();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const source = String(body.source ?? "voice-design") as CustomVoiceSource;

    if (!generatedVoiceId || !name || description.length < 20) {
      return jsonError({
        status: 400,
        code: "GENERATED_VOICE_REQUIRED",
        message: "Generated voice ID, name, and description are required.",
      });
    }

    const created = await saveGeneratedVoice({
      generatedVoiceId,
      name,
      description,
      source,
    });
    const stored = await upsertCustomVoice(
      voiceToStoredProfile(created, source, { name, description }),
    );

    return Response.json({ voice: stored });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "ELEVENLABS_SAVE_GENERATED_FAILED",
      message: getErrorMessage(error, "Could not save generated voice."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/save-generated");
