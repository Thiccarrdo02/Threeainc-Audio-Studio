"use client";

import { useCallback, useRef, useState } from "react";

import { MAX_INLINE_AUDIO_BYTES } from "@/config/limits";
import { clientStore, makeLocalId } from "@/lib/client-store";
import {
  countBillableCharacters,
  estimateCreditsFromCostUsd,
  estimateCustomVoiceTextCostUsd,
} from "@/lib/cost";
import { DEFAULT_ELEVENLABS_SETTINGS } from "@/types/custom-voices";
import type {
  LocalGeneration,
  TTSApiError,
  TTSGenerateRequest,
  TTSGenerateResponse,
} from "@/types/tts";

interface GenerationState {
  isGenerating: boolean;
  generation?: LocalGeneration;
  error?: TTSApiError["error"];
}

function isApiError(value: unknown): value is TTSApiError {
  return (
    typeof value === "object" &&
    value !== null &&
    "error" in value &&
    typeof (value as TTSApiError).error?.code === "string"
  );
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Unexpected non-string FileReader result."));
      }
    };
    reader.readAsDataURL(blob);
  });
}

async function readCustomVoiceResponse(
  response: Response,
): Promise<{
  audioUrl: string;
  persistableUrl?: string;
  fileName?: string;
  requestId?: string;
  fileSize?: number;
}> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload: unknown = await response.json();
    if (!response.ok) {
      if (isApiError(payload)) {
        throw payload;
      }
      throw new Error("Custom voice generation failed.");
    }

    const data = payload as {
      audio?: { url?: string; file_name?: string; file_size?: number };
      fileName?: string;
      requestId?: string;
    };
    if (!data.audio?.url) {
      throw new Error("Custom voice generation did not return a playable audio URL.");
    }
    return {
      audioUrl: data.audio.url,
      persistableUrl: data.audio.url,
      fileName: data.fileName ?? data.audio.file_name,
      requestId: data.requestId,
      fileSize: data.audio.file_size,
    };
  }

  if (!response.ok) {
    throw new Error("Custom voice generation failed.");
  }

  const bytes = await response.blob();
  // For playback we use an ObjectURL (cheap, no copy). For persistence we
  // convert to a data URL so the audio survives reloads — but only if the file
  // is small enough to live in localStorage without blowing the quota.
  const audioUrl = URL.createObjectURL(bytes);
  let persistableUrl: string | undefined;
  if (bytes.size <= MAX_INLINE_AUDIO_BYTES) {
    try {
      persistableUrl = await blobToDataUrl(bytes);
    } catch {
      persistableUrl = undefined;
    }
  }

  return {
    audioUrl,
    persistableUrl,
    fileName:
      response.headers.get("X-ThreeZinc-File-Name") ??
      "threezinc-custom-voice-audio.mp3",
    requestId: response.headers.get("X-ThreeZinc-Request-Id") ?? undefined,
    fileSize: bytes.size,
  };
}

export function useTTSGeneration() {
  const [state, setState] = useState<GenerationState>({ isGenerating: false });
  // In-flight guard prevents double-clicks / rapid-fire requests from issuing
  // duplicate billable calls. Using a ref keeps the check synchronous and
  // immune to React state-batching latency.
  const inflightRef = useRef(false);

  const generate = useCallback(async (request: TTSGenerateRequest) => {
    if (inflightRef.current) {
      return undefined;
    }
    inflightRef.current = true;
    setState((current) => ({
      ...current,
      isGenerating: true,
      error: undefined,
    }));

    try {
      if (request.provider === "custom") {
        const response = await fetch("/api/custom-voices/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            voiceId: request.voice,
            text: request.prompt,
            outputFormat:
              request.output_format === "mp3"
                ? "mp3_44100_128"
                : "mp3_22050_32",
            settings: DEFAULT_ELEVENLABS_SETTINGS,
          }),
        });

        const audio = await readCustomVoiceResponse(response);
        const characterCount = countBillableCharacters(request.prompt);
        const estimatedCost = estimateCustomVoiceTextCostUsd(characterCount);
        const generation: LocalGeneration = {
          id: makeLocalId("generation"),
          prompt: request.prompt,
          styleInstructions: request.style_instructions,
          mode: "single",
          voiceId: request.voice,
          languageCode: request.language_code,
          outputFormat: request.output_format,
          temperature: request.temperature,
          provider: "custom",
          audioUrl: audio.audioUrl,
          fileName: audio.fileName,
          fileSize: audio.fileSize,
          characterCount,
          estimatedCost,
          estimatedCredits: estimateCreditsFromCostUsd(estimatedCost),
          createdAt: new Date().toISOString(),
        };

        // Persist a stable URL (remote http(s) or data:) — never a transient
        // blob: URL, which dies on reload.
        const persistable = audio.persistableUrl;
        if (persistable && !persistable.startsWith("blob:")) {
          clientStore.addGeneration({ ...generation, audioUrl: persistable });
        }
        setState({ isGenerating: false, generation });
        return generation;
      }

      const response = await fetch("/api/tts/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const payload: unknown = await response.json();
      if (!response.ok) {
        if (isApiError(payload)) {
          setState((current) => ({
            ...current,
            isGenerating: false,
            error: payload.error,
          }));
          return undefined;
        }

        setState((current) => ({
          ...current,
          isGenerating: false,
          error: {
            code: "UNKNOWN_ERROR",
            message: "Generation failed with an unexpected response.",
            retryable: true,
          },
        }));
        return undefined;
      }

      const data = payload as TTSGenerateResponse;
      const generation: LocalGeneration = {
        id: makeLocalId("generation"),
        prompt: request.prompt,
        styleInstructions: request.style_instructions,
        mode: request.mode,
        voiceId: request.voice,
        speakers: request.speakers,
        languageCode: request.language_code,
        outputFormat: request.output_format,
        temperature: request.temperature,
        provider: "gemini",
        audioUrl: data.audio.url,
        fileName: data.audio.file_name,
        fileSize: data.audio.file_size,
        characterCount: data.characterCount,
        estimatedCost: data.estimatedCost,
        estimatedCredits: data.estimatedCredits,
        createdAt: new Date().toISOString(),
      };

      clientStore.addGeneration(generation);
      setState({ isGenerating: false, generation });
      return generation;
    } catch (error) {
      if (isApiError(error)) {
        setState((current) => ({
          ...current,
          isGenerating: false,
          error: error.error,
        }));
        return undefined;
      }

      setState((current) => ({
        ...current,
        isGenerating: false,
        error: {
          code: "NETWORK_ERROR",
          message:
            error instanceof Error
              ? error.message
              : "Could not reach the local generation route.",
          retryable: true,
        },
      }));
      return undefined;
    } finally {
      inflightRef.current = false;
    }
  }, []);

  const clearGeneration = useCallback(() => {
    setState({ isGenerating: false });
  }, []);

  const clearError = useCallback(() => {
    setState((current) => ({ ...current, error: undefined }));
  }, []);

  return {
    ...state,
    generate,
    clearGeneration,
    clearError,
  };
}
