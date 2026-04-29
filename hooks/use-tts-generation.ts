"use client";

import { useCallback, useState } from "react";

import { clientStore, makeLocalId } from "@/lib/client-store";
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

export function useTTSGeneration() {
  const [state, setState] = useState<GenerationState>({ isGenerating: false });

  const generate = useCallback(async (request: TTSGenerateRequest) => {
    setState((current) => ({
      ...current,
      isGenerating: true,
      error: undefined,
    }));

    try {
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
    } catch {
      setState((current) => ({
        ...current,
        isGenerating: false,
        error: {
          code: "NETWORK_ERROR",
          message: "Could not reach the local generation route.",
          retryable: true,
        },
      }));
      return undefined;
    }
  }, []);

  const clearGeneration = useCallback(() => {
    setState({ isGenerating: false });
  }, []);

  return {
    ...state,
    generate,
    clearGeneration,
  };
}
