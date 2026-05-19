import { NextResponse } from "next/server";

import { SEEDED_SHARED_VOICES } from "@/config/shared-voice-seeds";
import { listSharedVoices, type SharedVoiceSummary } from "@/lib/elevenlabs";
import type { TTSApiError } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 30;

function errorResponse(status: number, code: string, message: string) {
  const body: TTSApiError = {
    error: { code, message, retryable: status >= 500 },
  };
  return NextResponse.json(body, { status });
}

const TARGET_LIBRARY_VOICES = 60;
const CURATED_HINDI_BUDGET = 35;
const INDIAN_ENGLISH_BUDGET = 18;
const INDIA_SEARCH_BUDGET = 18;
const TRENDING_BUDGET = 100;
const PER_LANGUAGE_BUDGET = 4;

function languageKey(value?: string) {
  if (!value) return "unknown";
  return value.trim().toLowerCase();
}

function dedupe(...lists: SharedVoiceSummary[][]): SharedVoiceSummary[] {
  const seen = new Set<string>();
  const out: SharedVoiceSummary[] = [];
  for (const list of lists) {
    for (const voice of list) {
      const key = `${voice.publicOwnerId}:${voice.voiceId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(voice);
    }
  }
  return out;
}

/**
 * Curated library mix: many Hindi voices, a healthy chunk of Indian English,
 * and at most a couple of voices per other language so the library doesn't
 * drown in (e.g.) American narrator voices.
 */
async function fetchCuratedVoices(): Promise<SharedVoiceSummary[]> {
  const [hindi, indianEnglish, indiaSearch, trending] = await Promise.allSettled([
    listSharedVoices({ search: "Hindi", pageSize: CURATED_HINDI_BUDGET }),
    listSharedVoices({ search: "Indian English", pageSize: INDIAN_ENGLISH_BUDGET }),
    listSharedVoices({ search: "India", pageSize: INDIA_SEARCH_BUDGET }),
    listSharedVoices({ pageSize: TRENDING_BUDGET }),
  ]);

  const hindiVoices = hindi.status === "fulfilled" ? hindi.value.voices : [];
  const indianVoices =
    indianEnglish.status === "fulfilled" ? indianEnglish.value.voices : [];
  const indiaSearchVoices =
    indiaSearch.status === "fulfilled" ? indiaSearch.value.voices : [];
  const trendingVoices =
    trending.status === "fulfilled" ? trending.value.voices : [];

  // Keep all Hindi + Indian English voices; cap other-language voices.
  const merged = dedupe(hindiVoices, indianVoices, indiaSearchVoices);
  const perLanguage = new Map<string, number>();
  // Seed counts so Hindi/Indian-English aren't accidentally capped further.
  for (const voice of merged) {
    const key = languageKey(voice.language);
    perLanguage.set(key, (perLanguage.get(key) ?? 0) + 1);
  }

  for (const voice of trendingVoices) {
    if (merged.some(
      (item) => item.publicOwnerId === voice.publicOwnerId && item.voiceId === voice.voiceId,
    )) {
      continue;
    }
    const key = languageKey(voice.language);
    // Hindi voices always allowed; everything else respects the per-language cap.
    if (key !== "hi" && key !== "hindi") {
      const count = perLanguage.get(key) ?? 0;
      if (count >= PER_LANGUAGE_BUDGET) continue;
      perLanguage.set(key, count + 1);
    }
    merged.push(voice);
    if (merged.length >= TARGET_LIBRARY_VOICES) break;
  }

  return dedupe(merged, SEEDED_SHARED_VOICES).slice(0, TARGET_LIBRARY_VOICES);
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || undefined;
    const language = url.searchParams.get("language")?.trim() || undefined;
    const pageSizeParam = url.searchParams.get("pageSize");
    const pageSize = pageSizeParam ? Number(pageSizeParam) : undefined;

    // Default load (no search/language/pageSize): curated mix.
    if (!search && !language && !pageSize) {
      const voices = await fetchCuratedVoices();
      return NextResponse.json({ voices, hasMore: false });
    }

    const result = await listSharedVoices({
      search,
      language,
      pageSize: pageSize && Number.isFinite(pageSize) ? pageSize : 60,
    });
    return NextResponse.json(result);
  } catch (error) {
    const url = new URL(request.url);
    const isDefaultLoad =
      !url.searchParams.get("search") &&
      !url.searchParams.get("language") &&
      !url.searchParams.get("pageSize");
    if (isDefaultLoad) {
      return NextResponse.json({
        voices: SEEDED_SHARED_VOICES.slice(0, TARGET_LIBRARY_VOICES),
        hasMore: false,
      });
    }
    return errorResponse(
      502,
      "VOICE_LIBRARY_SEARCH_FAILED",
      error instanceof Error ? error.message : "Could not search voices.",
    );
  }
}
