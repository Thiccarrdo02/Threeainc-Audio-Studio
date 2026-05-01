import { NextResponse } from "next/server";

import {
  addInstantCloneVoice,
  voiceToStoredProfile,
} from "@/lib/elevenlabs";
import { upsertCustomVoice } from "@/lib/local-custom-voices";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 120;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: {
      code,
      message,
      retryable: status >= 500,
    },
  };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const name = String(formData.get("name") ?? "").trim();
    const description = String(formData.get("description") ?? "").trim();
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
      return errorResponse(
        400,
        "VOICE_CONSENT_REQUIRED",
        "Confirm that you own this voice or have permission to clone it.",
      );
    }

    if (!name || description.length < 10) {
      return errorResponse(
        400,
        "VOICE_DETAILS_REQUIRED",
        "Voice name and description are required.",
      );
    }

    if (files.length === 0) {
      return errorResponse(
        400,
        "VOICE_SAMPLE_REQUIRED",
        "Upload at least one voice sample.",
      );
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
    const stored = await upsertCustomVoice(
      {
        ...profile,
        labels: {
          ...profile.labels,
          ...labels,
        },
      },
    );

    return NextResponse.json({ voice: stored });
  } catch (error) {
    return errorResponse(
      502,
      "ELEVENLABS_CLONE_FAILED",
      error instanceof Error ? error.message : "Voice cloning failed.",
    );
  }
}
