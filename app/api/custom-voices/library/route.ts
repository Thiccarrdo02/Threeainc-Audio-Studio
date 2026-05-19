import { SEEDED_SHARED_VOICES } from "@/config/shared-voice-seeds";
import { listSharedVoices, type SharedVoiceSummary } from "@/lib/elevenlabs";
import { getErrorMessage, jsonError } from "@/lib/api-utils";
import { withRequestLogging } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 30;

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

  const merged = dedupe(hindiVoices, indianVoices, indiaSearchVoices);
  const perLanguage = new Map<string, number>();
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

async function handleGet(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim() || undefined;
    const language = url.searchParams.get("language")?.trim() || undefined;
    const pageSizeParam = url.searchParams.get("pageSize");
    const pageSize = pageSizeParam ? Number(pageSizeParam) : undefined;

    if (!search && !language && !pageSize) {
      const voices = await fetchCuratedVoices();
      return Response.json({ voices, hasMore: false });
    }

    const result = await listSharedVoices({
      search,
      language,
      pageSize: pageSize && Number.isFinite(pageSize) ? pageSize : 60,
    });
    return Response.json(result);
  } catch (error) {
    const url = new URL(request.url);
    const isDefaultLoad =
      !url.searchParams.get("search") &&
      !url.searchParams.get("language") &&
      !url.searchParams.get("pageSize");
    if (isDefaultLoad) {
      return Response.json({
        voices: SEEDED_SHARED_VOICES.slice(0, TARGET_LIBRARY_VOICES),
        hasMore: false,
      });
    }
    return jsonError({
      status: 502,
      code: "VOICE_LIBRARY_SEARCH_FAILED",
      message: getErrorMessage(error, "Could not search voices."),
    });
  }
}

export const GET = withRequestLogging(handleGet, "GET /api/custom-voices/library");
