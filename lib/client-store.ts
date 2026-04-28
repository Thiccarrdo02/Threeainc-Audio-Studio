"use client";

import type { LocalGeneration, LocalScript, StudioState } from "@/types/tts";

const SETTINGS_KEY = "threezinc-audio.settings.v1";
const SCRIPTS_KEY = "threezinc-audio.scripts.v1";
const GENERATIONS_KEY = "threezinc-audio.generations.v1";

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

function writeJson<T>(key: string, value: T) {
  if (!canUseStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
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
      outputFormat: stored?.outputFormat ?? fallback.outputFormat,
      temperature: stored?.temperature ?? fallback.temperature,
      accentPreset: stored?.accentPreset ?? fallback.accentPreset,
      tonePreset: stored?.tonePreset ?? fallback.tonePreset,
      pacePreset: stored?.pacePreset ?? fallback.pacePreset,
    };
  },

  saveSettings(state: StudioState) {
    writeJson<StoredSettings>(SETTINGS_KEY, { state });
  },

  listScripts(): LocalScript[] {
    return readJson<LocalScript[]>(SCRIPTS_KEY, []);
  },

  upsertScript(script: LocalScript) {
    const scripts = this.listScripts();
    const next = [
      script,
      ...scripts.filter((existing) => existing.id !== script.id),
    ].slice(0, 20);
    writeJson(SCRIPTS_KEY, next);
  },

  listGenerations(): LocalGeneration[] {
    return readJson<LocalGeneration[]>(GENERATIONS_KEY, []);
  },

  addGeneration(generation: LocalGeneration) {
    const generations = this.listGenerations();
    writeJson(GENERATIONS_KEY, [generation, ...generations].slice(0, 30));
  },

  deleteGeneration(id: string) {
    writeJson(
      GENERATIONS_KEY,
      this.listGenerations().filter((generation) => generation.id !== id),
    );
  },
};

export function makeLocalId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }

  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}
