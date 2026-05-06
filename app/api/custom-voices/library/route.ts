import { NextResponse } from "next/server";

import { listSharedVoices } from "@/lib/elevenlabs";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 30;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || undefined;
    const language = url.searchParams.get("language")?.trim() || undefined;
    const result = await listSharedVoices({
      search,
      language,
      pageSize: 18,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(
      502,
      "VOICE_LIBRARY_SEARCH_FAILED",
      error instanceof Error ? error.message : "Could not search voices.",
    );
  }
}
