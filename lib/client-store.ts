"use client";

import {
  MAX_STORED_GENERATIONS,
  MAX_STORED_SCRIPTS,
} from "@/config/limits";
import { storageKey } from "@/lib/storage-keys";
import type { LocalGeneration, LocalScript, StudioState } from "@/types/tts";

const SETTINGS_KEY = storageKey("settings");
const SCRIPTS_KEY = storageKey("scripts");
const GENERATIONS_KEY = storageKey("generations");

export const STORAGE_QUOTA_EVENT = "threezinc:storage-quota-exceeded";

export interface StoredSettings {
  state: StudioState;
}

type PartialStudioState = Partial<StudioState> & {
  speakers?: StudioState["speakers"];
};

function canUseStorage() {
  return typeof window !== "undefined" && "localStorage" in window;
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function isQuotaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { name?: string; code?: number };
  return (
    candidate.name === "QuotaExceededError" ||
    candidate.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    candidate.code === 22 ||
    candidate.code === 1014
  );
}

function emitQuotaEvent(detail: { key: string; size: number }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(STORAGE_QUOTA_EVENT, { detail }));
}

function writeJson<T>(key: string, value: T): boolean {
  if (!canUseStorage()) {
    return false;
  }

  const serialized = JSON.stringify(value);

  try {
    window.localStorage.setItem(key, serialized);
    return true;
  } catch (error) {
    if (isQuotaError(error)) {
      emitQuotaEvent({ key, size: serialized.length });
    }
    return false;
  }
}

export const clientStore = {
  getSettings(fallback: StudioState): StudioState {
    const stored = readJson<{ state?: PartialStudioState }>(SETTINGS_KEY, {
      state: fallback,
    }).state;

    return {
      ...fallback,
      ...(stored ?? {}),
      speakers: stored?.speakers ?? fallback.speakers,
      provider: stored?.provider ?? fallback.provider,
      outputFormat: stored?.outputFormat ?? fallback.outputFormat,
      temperature: stored?.temperature ?? fallback.temperature,
      accentPreset: stored?.accentPreset ?? fallback.accentPreset,
      accentStrength:
        typeof stored?.accentStrength === "number"
          ? stored.accentStrength
          : fallback.accentStrength,
      tonePreset: stored?.tonePreset ?? fallback.tonePreset,
      pacePreset: stored?.pacePreset ?? fallback.pacePreset,
    };
  },

  saveSettings(state: StudioState) {
    return writeJson<StoredSettings>(SETTINGS_KEY, { state });
  },

  listScripts(): LocalScript[] {
    return readJson<LocalScript[]>(SCRIPTS_KEY, []);
  },

  upsertScript(script: LocalScript) {
    const scripts = this.listScripts();
    const next = [
      script,
      ...scripts.filter((existing) => existing.id !== script.id),
    ].slice(0, MAX_STORED_SCRIPTS);
    return writeJson(SCRIPTS_KEY, next);
  },

  deleteScript(id: string) {
    return writeJson(
      SCRIPTS_KEY,
      this.listScripts().filter((script) => script.id !== id),
    );
  },

  listGenerations(): LocalGeneration[] {
    return readJson<LocalGeneration[]>(GENERATIONS_KEY, []);
  },

  addGeneration(generation: LocalGeneration) {
    const generations = this.listGenerations();
    const next = [generation, ...generations].slice(0, MAX_STORED_GENERATIONS);

    // If we still hit quota (e.g. inline data URLs are large), progressively trim
    // older items until it fits. Returns true on success.
    let attempt = [...next];
    while (attempt.length > 0) {
      if (writeJson(GENERATIONS_KEY, attempt)) {
        return true;
      }
      attempt = attempt.slice(0, attempt.length - 1);
    }
    return false;
  },

  deleteGeneration(id: string) {
    return writeJson(
      GENERATIONS_KEY,
      this.listGenerations().filter((generation) => generation.id !== id),
    );
  },

  clearGenerations() {
    return writeJson(GENERATIONS_KEY, []);
  },
};

export function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
