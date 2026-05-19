import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { logger } from "@/lib/logger";
import {
  DEFAULT_ELEVENLABS_SETTINGS,
  type CustomVoiceProfile,
} from "@/types/custom-voices";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * Locally, voices persist to `<project>/.local/custom-voices.json`. On
 * serverless platforms (Vercel/Lambda/etc.) the deployment directory is
 * read-only, so we fall back to the OS temp dir. The temp file is per-instance
 * and lost on cold start, but provider-side state (ElevenLabs/Fal) survives —
 * cold starts just show an empty local index until the user re-imports.
 */
function isReadOnlyDeployment(): boolean {
  return Boolean(process.env.VERCEL) || Boolean(process.env.LAMBDA_TASK_ROOT);
}

const storeDir = isReadOnlyDeployment()
  ? join(tmpdir(), "threezinc-audio-studio")
  : join(projectRoot, ".local");
const storePath = join(storeDir, "custom-voices.json");

interface CustomVoiceStore {
  voices: CustomVoiceProfile[];
}

async function readStore(): Promise<CustomVoiceStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const parsed = JSON.parse(raw) as Partial<CustomVoiceStore>;
    return {
      voices: Array.isArray(parsed.voices) ? parsed.voices : [],
    };
  } catch {
    return { voices: [] };
  }
}

async function writeStore(store: CustomVoiceStore): Promise<boolean> {
  try {
    await mkdir(storeDir, { recursive: true });
    await writeFile(storePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
    return true;
  } catch (error) {
    // Persistence failures should not bubble up — provider-side state is the
    // source of truth. Log so operators can see this in serverless logs.
    logger.warn("custom-voices.persistence_failed", {
      storeDir,
      reason: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

export async function listCustomVoices() {
  const store = await readStore();
  return store.voices;
}

export async function upsertCustomVoice(
  voice: Omit<CustomVoiceProfile, "id" | "createdAt" | "updatedAt"> &
    Partial<Pick<CustomVoiceProfile, "id" | "createdAt" | "updatedAt">>,
) {
  const store = await readStore();
  const now = new Date().toISOString();
  const nextVoice: CustomVoiceProfile = {
    ...voice,
    id: voice.id ?? `custom_voice_${randomUUID()}`,
    settings: voice.settings ?? DEFAULT_ELEVENLABS_SETTINGS,
    createdAt: voice.createdAt ?? now,
    updatedAt: now,
  };

  const nextVoices = [
    nextVoice,
    ...store.voices.filter((item) => item.voiceId !== nextVoice.voiceId),
  ];
  await writeStore({ voices: nextVoices });
  return nextVoice;
}

export async function getCustomVoiceByProviderId(voiceId: string) {
  const voices = await listCustomVoices();
  return voices.find((voice) => voice.voiceId === voiceId);
}

export async function removeCustomVoice(voiceId: string) {
  const store = await readStore();
  const existing = store.voices.find((voice) => voice.voiceId === voiceId);
  await writeStore({
    voices: store.voices.filter((voice) => voice.voiceId !== voiceId),
  });
  return existing;
}

export async function updateCustomVoiceMetadata(
  voiceId: string,
  patch: Partial<Pick<CustomVoiceProfile, "name" | "description">>,
) {
  const store = await readStore();
  const existing = store.voices.find((voice) => voice.voiceId === voiceId);
  if (!existing) {
    return undefined;
  }

  const now = new Date().toISOString();
  const updated: CustomVoiceProfile = {
    ...existing,
    ...(patch.name !== undefined ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    updatedAt: now,
  };

  await writeStore({
    voices: store.voices.map((voice) =>
      voice.voiceId === voiceId ? updated : voice,
    ),
  });

  return updated;
}
