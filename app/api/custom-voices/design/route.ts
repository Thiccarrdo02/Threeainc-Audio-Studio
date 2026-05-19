import { designVoicePreviews } from "@/lib/elevenlabs";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 120;

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function clamp(value: number | undefined, min: number, max: number) {
  if (typeof value !== "number") return undefined;
  return Math.min(max, Math.max(min, value));
}

async function handlePost(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const description = String(body.description ?? "").trim();
    if (description.length < 20) {
      return jsonError({
        status: 400,
        code: "VOICE_DESCRIPTION_TOO_SHORT",
        message: "Create voice description must be at least 20 characters.",
      });
    }

    const result = await designVoicePreviews({
      description,
      loudness: clamp(optionalNumber(body.loudness), -1, 1),
      quality: clamp(optionalNumber(body.quality), -1, 1),
      guidanceScale: clamp(optionalNumber(body.guidanceScale), 0, 100),
      seed: optionalNumber(body.seed),
    });
    return Response.json(result);
  } catch (error) {
    return jsonError({
      status: 502,
      code: "CUSTOM_VOICE_CREATE_FAILED",
      message: getErrorMessage(error, "Create voice failed."),
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/custom-voices/design");
