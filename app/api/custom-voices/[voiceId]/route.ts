import { deleteElevenLabsVoice } from "@/lib/elevenlabs";
import {
  getCustomVoiceByProviderId,
  removeCustomVoice,
  updateCustomVoiceMetadata,
} from "@/lib/local-custom-voices";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";
import {
  MAX_VOICE_DESCRIPTION_LENGTH,
  MAX_VOICE_NAME_LENGTH,
} from "@/config/limits";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ voiceId: string }> };

async function handleDelete(_request: Request, context: RouteContext) {
  const { voiceId } = await context.params;
  if (!voiceId) {
    return jsonError({
      status: 400,
      code: "VOICE_ID_REQUIRED",
      message: "Voice ID is required.",
    });
  }

  try {
    const existing = await getCustomVoiceByProviderId(voiceId);
    if (!existing || existing.provider === "elevenlabs") {
      await deleteElevenLabsVoice(voiceId);
    }
    await removeCustomVoice(voiceId);
    return Response.json({ status: "ok" });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_DELETE_FAILED",
      message: getErrorMessage(error, "Could not delete custom voice."),
    });
  }
}

async function handlePatch(request: Request, context: RouteContext) {
  const { voiceId } = await context.params;
  if (!voiceId) {
    return jsonError({
      status: 400,
      code: "VOICE_ID_REQUIRED",
      message: "Voice ID is required.",
    });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const name =
      typeof body.name === "string"
        ? body.name.trim().slice(0, MAX_VOICE_NAME_LENGTH)
        : undefined;
    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, MAX_VOICE_DESCRIPTION_LENGTH)
        : undefined;

    if (name === "" || (name === undefined && description === undefined)) {
      return jsonError({
        status: 400,
        code: "VOICE_METADATA_REQUIRED",
        message: "A voice name or description is required.",
      });
    }

    const updated = await updateCustomVoiceMetadata(voiceId, {
      ...(name !== undefined ? { name } : {}),
      ...(description !== undefined ? { description } : {}),
    });

    if (!updated) {
      return jsonError({
        status: 404,
        code: "VOICE_NOT_FOUND",
        message: "Voice was not found.",
      });
    }

    return Response.json({ voice: updated });
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_UPDATE_FAILED",
      message: getErrorMessage(error, "Could not update custom voice."),
    });
  }
}

export const DELETE = withRequestLogging(
  handleDelete as (request: Request, ...args: unknown[]) => Promise<Response>,
  "DELETE /api/custom-voices/[voiceId]",
) as (request: Request, context: RouteContext) => Promise<Response>;

export const PATCH = withRequestLogging(
  handlePatch as (request: Request, ...args: unknown[]) => Promise<Response>,
  "PATCH /api/custom-voices/[voiceId]",
) as (request: Request, context: RouteContext) => Promise<Response>;
