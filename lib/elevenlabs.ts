import { randomUUID } from "node:crypto";

import {
  DEFAULT_ELEVENLABS_SETTINGS,
  type CustomVoiceProfile,
  type CustomVoiceSource,
  type ElevenLabsVoiceSettings,
  type VoicePreviewCandidate,
} from "@/types/custom-voices";

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io";

export const ELEVENLABS_OUTPUT_FORMATS = [
  { id: "mp3_44100_128", label: "MP3 44.1k 128kbps" },
  { id: "mp3_22050_32", label: "MP3 22.05k 32kbps" },
] as const;

export interface CustomVoiceSubscription {
  tier?: string;
  status?: string;
  characterCount?: number;
  characterLimit?: number;
  voiceSlotsUsed?: number;
  voiceLimit?: number;
  canUseInstantVoiceCloning: boolean;
  canUseProfessionalVoiceCloning: boolean;
}

export interface SharedVoiceSummary {
  publicOwnerId: string;
  voiceId: string;
  name: string;
  description: string;
  accent?: string;
  gender?: string;
  age?: string;
  useCase?: string;
  language?: string;
  previewUrl?: string;
  category?: string;
}

function getApiKey() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    throw new Error("Custom voice key is not configured.");
  }
  return key;
}

export function sanitizeFileName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function createCustomVoiceFileName(voiceName: string, suffix = "audio") {
  return [
    "threezinc-voice",
    sanitizeFileName(voiceName) || "custom-voice",
    sanitizeFileName(randomUUID()).slice(0, 10),
    suffix,
  ].join("-") + ".mp3";
}

export function toElevenLabsSettings(settings?: Partial<ElevenLabsVoiceSettings>) {
  const next = {
    ...DEFAULT_ELEVENLABS_SETTINGS,
    ...(settings ?? {}),
  };

  return {
    stability: next.stability,
    similarity_boost: next.similarityBoost,
    style: next.style,
    speed: next.speed,
    use_speaker_boost: next.useSpeakerBoost,
  };
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};

  if (!response.ok) {
    const message =
      typeof parsed?.detail?.message === "string"
        ? parsed.detail.message
        : typeof parsed?.message === "string"
          ? parsed.message
          : `Voice service request failed with ${response.status}.`;
    throw new Error(message);
  }

  return parsed as T;
}

async function elevenLabsFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("xi-api-key", getApiKey());
  return fetch(`${ELEVENLABS_API_BASE}${path}`, {
    ...init,
    headers,
  });
}

export async function getCustomVoiceSubscription(): Promise<CustomVoiceSubscription> {
  const response = await elevenLabsFetch("/v1/user/subscription");
  const data = await parseJsonResponse<Record<string, unknown>>(response);

  return {
    tier: typeof data.tier === "string" ? data.tier : undefined,
    status: typeof data.status === "string" ? data.status : undefined,
    characterCount:
      typeof data.character_count === "number" ? data.character_count : undefined,
    characterLimit:
      typeof data.character_limit === "number" ? data.character_limit : undefined,
    voiceSlotsUsed:
      typeof data.voice_slots_used === "number"
        ? data.voice_slots_used
        : undefined,
    voiceLimit:
      typeof data.voice_limit === "number" ? data.voice_limit : undefined,
    canUseInstantVoiceCloning: data.can_use_instant_voice_cloning === true,
    canUseProfessionalVoiceCloning:
      data.can_use_professional_voice_cloning === true,
  };
}

function mapSharedVoice(voice: Record<string, unknown>): SharedVoiceSummary {
  const description = String(voice.description ?? "").replace(
    /ElevenLabs/gi,
    "the voice library",
  );

  return {
    publicOwnerId: String(voice.public_owner_id ?? ""),
    voiceId: String(voice.voice_id ?? ""),
    name: String(voice.name ?? "Library voice"),
    description,
    accent: typeof voice.accent === "string" ? voice.accent : undefined,
    gender: typeof voice.gender === "string" ? voice.gender : undefined,
    age: typeof voice.age === "string" ? voice.age : undefined,
    useCase: typeof voice.use_case === "string" ? voice.use_case : undefined,
    language: typeof voice.language === "string" ? voice.language : undefined,
    previewUrl:
      typeof voice.preview_url === "string" ? voice.preview_url : undefined,
    category: typeof voice.category === "string" ? voice.category : undefined,
  };
}

export async function listSharedVoices({
  search,
  language,
  pageSize = 18,
}: {
  search?: string;
  language?: string;
  pageSize?: number;
}) {
  const params = new URLSearchParams({
    page_size: String(Math.min(100, Math.max(1, pageSize))),
    sort: "trending",
  });
  if (search) {
    params.set("search", search);
  }
  if (language) {
    params.set("language", language);
  }

  const response = await elevenLabsFetch(`/v1/shared-voices?${params.toString()}`);
  const data = await parseJsonResponse<{
    voices?: Record<string, unknown>[];
    has_more?: boolean;
    total_count?: number;
  }>(response);

  return {
    voices: (data.voices ?? [])
      .map(mapSharedVoice)
      .filter((voice) => voice.publicOwnerId && voice.voiceId),
    hasMore: data.has_more === true,
    totalCount:
      typeof data.total_count === "number" ? data.total_count : undefined,
  };
}

export async function addSharedVoiceToLibrary({
  publicOwnerId,
  voiceId,
  name,
}: {
  publicOwnerId: string;
  voiceId: string;
  name: string;
}) {
  const response = await elevenLabsFetch(
    `/v1/voices/add/${encodeURIComponent(publicOwnerId)}/${encodeURIComponent(
      voiceId,
    )}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_name: name,
        bookmarked: true,
      }),
    },
  );

  return parseJsonResponse<{ voice_id: string }>(response);
}

export async function addInstantCloneVoice({
  name,
  description,
  files,
  removeBackgroundNoise,
  labels,
}: {
  name: string;
  description: string;
  files: File[];
  removeBackgroundNoise: boolean;
  labels?: Record<string, string>;
}) {
  const formData = new FormData();
  formData.set("name", name);
  formData.set("description", description);
  formData.set("remove_background_noise", String(removeBackgroundNoise));
  formData.set(
    "labels",
    JSON.stringify({
      app: "threezinc-audio-studio",
      source: "instant-clone",
      ...(labels ?? {}),
    }),
  );

  files.forEach((file) => {
    formData.append("files", file, file.name);
  });

  const response = await elevenLabsFetch("/v1/voices/add", {
    method: "POST",
    body: formData,
  });

  return parseJsonResponse<{ voice_id: string }>(response);
}

export async function convertSpeechToSpeech({
  voiceId,
  audio,
  outputFormat,
  removeBackgroundNoise,
  seed,
  settings,
}: {
  voiceId: string;
  audio: File;
  outputFormat: string;
  removeBackgroundNoise: boolean;
  seed?: number;
  settings?: Partial<ElevenLabsVoiceSettings>;
}) {
  const params = new URLSearchParams({ output_format: outputFormat });
  const formData = new FormData();
  formData.set("audio", audio, audio.name);
  formData.set("model_id", "eleven_multilingual_sts_v2");
  formData.set("remove_background_noise", String(removeBackgroundNoise));
  formData.set("voice_settings", JSON.stringify(toElevenLabsSettings(settings)));
  if (typeof seed === "number") {
    formData.set("seed", String(seed));
  }

  const response = await elevenLabsFetch(
    `/v1/speech-to-speech/${encodeURIComponent(voiceId)}?${params.toString()}`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    await parseJsonResponse(response);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    requestId: response.headers.get("request-id") ?? undefined,
  };
}

export async function createSpeech({
  voiceId,
  text,
  outputFormat,
  seed,
  settings,
}: {
  voiceId: string;
  text: string;
  outputFormat: string;
  seed?: number;
  settings?: Partial<ElevenLabsVoiceSettings>;
}) {
  const params = new URLSearchParams({ output_format: outputFormat });
  const response = await elevenLabsFetch(
    `/v1/text-to-speech/${encodeURIComponent(voiceId)}?${params.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: toElevenLabsSettings(settings),
        ...(typeof seed === "number" ? { seed } : {}),
      }),
    },
  );

  if (!response.ok) {
    await parseJsonResponse(response);
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "audio/mpeg",
    requestId: response.headers.get("request-id") ?? undefined,
  };
}

function mapPreviewCandidate(
  preview: {
    generated_voice_id?: string;
    audio_base_64?: string;
    media_type?: string;
    duration_secs?: number;
  },
  text?: string,
): VoicePreviewCandidate {
  const mediaType = preview.media_type ?? "audio/mpeg";
  const generatedVoiceId = preview.generated_voice_id ?? randomUUID();
  return {
    id: `preview_${generatedVoiceId}`,
    generatedVoiceId,
    mediaType,
    audioDataUrl: `data:${mediaType};base64,${preview.audio_base_64 ?? ""}`,
    durationSecs: preview.duration_secs,
    text,
  };
}

export async function designVoicePreviews({
  description,
  text,
  referenceAudioBase64,
  promptStrength,
  loudness,
  quality,
  guidanceScale,
  seed,
  modelId = "eleven_multilingual_ttv_v2",
  outputFormat = "mp3_44100_128",
}: {
  description: string;
  text?: string;
  referenceAudioBase64?: string;
  promptStrength?: number;
  loudness?: number;
  quality?: number;
  guidanceScale?: number;
  seed?: number;
  modelId?: "eleven_multilingual_ttv_v2" | "eleven_ttv_v3";
  outputFormat?: string;
}) {
  const params = new URLSearchParams({ output_format: outputFormat });
  const isReferenceDesign = modelId === "eleven_ttv_v3";
  const payload = {
    voice_description: description,
    model_id: modelId,
    ...(text ? { text } : { auto_generate_text: true }),
    ...(referenceAudioBase64 ? { reference_audio_base64: referenceAudioBase64 } : {}),
    ...(typeof promptStrength === "number"
      ? { prompt_strength: promptStrength }
      : {}),
    ...(typeof loudness === "number" ? { loudness } : {}),
    ...(!isReferenceDesign && typeof quality === "number" ? { quality } : {}),
    ...(typeof guidanceScale === "number" ? { guidance_scale: guidanceScale } : {}),
    ...(typeof seed === "number" ? { seed } : {}),
  };

  const response = await elevenLabsFetch(
    `/v1/text-to-voice/design?${params.toString()}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const data = await parseJsonResponse<{
    previews?: Array<Parameters<typeof mapPreviewCandidate>[0]>;
    text?: string;
  }>(response);

  return {
    text: data.text,
    previews: (data.previews ?? []).map((preview) =>
      mapPreviewCandidate(preview, data.text),
    ),
  };
}

export async function instantTextVoicePreviews({
  description,
  text,
  referenceAudio,
  promptStrength,
  loudness,
  guidanceScale,
  seed,
  outputFormat,
}: {
  description: string;
  text: string;
  referenceAudio: File;
  promptStrength?: number;
  loudness?: number;
  guidanceScale?: number;
  seed?: number;
  outputFormat?: string;
}) {
  const referenceAudioBase64 = Buffer.from(
    await referenceAudio.arrayBuffer(),
  ).toString("base64");

  return designVoicePreviews({
    description,
    text,
    referenceAudioBase64,
    promptStrength,
    loudness,
    guidanceScale,
    seed,
    outputFormat,
    modelId: "eleven_ttv_v3",
  });
}

export async function remixVoicePreviews({
  voiceId,
  description,
  promptStrength,
}: {
  voiceId: string;
  description: string;
  promptStrength: number;
}) {
  const response = await elevenLabsFetch(
    `/v1/text-to-voice/${encodeURIComponent(voiceId)}/remix?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        voice_description: description,
        auto_generate_text: true,
        prompt_strength: promptStrength,
      }),
    },
  );

  const data = await parseJsonResponse<{
    previews?: Array<Parameters<typeof mapPreviewCandidate>[0]>;
    text?: string;
  }>(response);

  return {
    text: data.text,
    previews: (data.previews ?? []).map((preview) =>
      mapPreviewCandidate(preview, data.text),
    ),
  };
}

export async function saveGeneratedVoice({
  generatedVoiceId,
  name,
  description,
  source,
}: {
  generatedVoiceId: string;
  name: string;
  description: string;
  source: CustomVoiceSource;
}) {
  const response = await elevenLabsFetch("/v1/text-to-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      voice_name: name,
      voice_description: description,
      generated_voice_id: generatedVoiceId,
      labels: {
        app: "threezinc-audio-studio",
        source,
      },
    }),
  });

  return parseJsonResponse<{
    voice_id: string;
    name?: string;
    description?: string;
    preview_url?: string;
  }>(response);
}

export async function deleteElevenLabsVoice(voiceId: string) {
  const response = await elevenLabsFetch(
    `/v1/voices/${encodeURIComponent(voiceId)}`,
    { method: "DELETE" },
  );

  return parseJsonResponse<{ status: string }>(response);
}

export function voiceToStoredProfile(
  voice: {
    voice_id?: string;
    name?: string;
    description?: string;
    preview_url?: string;
  },
  source: CustomVoiceSource,
  fallback: { name: string; description: string },
): Omit<CustomVoiceProfile, "id" | "createdAt" | "updatedAt"> {
  return {
    provider: "elevenlabs",
    voiceId: voice.voice_id ?? "",
    name: voice.name || fallback.name,
    description: voice.description || fallback.description,
    source,
    previewUrl: voice.preview_url,
    labels: {
      source,
    },
    settings: DEFAULT_ELEVENLABS_SETTINGS,
  };
}
