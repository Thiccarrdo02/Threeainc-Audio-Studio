import {
  addSharedVoiceToLibrary,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const publicOwnerId = String(body.publicOwnerId ?? "").trim();
    const voiceId = String(body.voiceId ?? "").trim();
    const name = String(body.name ?? "Library voice").trim();
    const description = String(body.description ?? "").trim();
    const previewUrl = String(body.previewUrl ?? "").trim();

    if (!publicOwnerId || !voiceId || !name) {
      return jsonError({
        status: 400,
        code: "VOICE_LIBRARY_IMPORT_REQUIRED",
        message: "Voice library owner, voice ID, and name are required.",
      });
    }

    const created = await addSharedVoiceToLibrary({
      publicOwnerId,
      voiceId,
      name,
    });
    const stored = await upsertCustomVoice({
      ...voiceToStoredProfile(
        {
          voice_id: created.voice_id,
          name,
          description,
          preview_url: previewUrl || undefined,
        },
        "voice-library",
        {
          name,
          description: description || "Imported voice library voice.",
        },
      ),
      previewUrl: previewUrl || undefined,
    });

    return Response.json({ voice: stored });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "VOICE_LIBRARY_IMPORT_FAILED",
      message: getErrorMessage(error, "Could not import voice."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/library/import");
