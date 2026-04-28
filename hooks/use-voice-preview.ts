"use client";

import { useCallback, useState } from "react";

import type { AudioSource, useAudioManager } from "@/hooks/use-audio-manager";
import type { Voice } from "@/types/tts";

type AudioManager = ReturnType<typeof useAudioManager>;

export function useVoicePreview(audioManager: AudioManager) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = useCallback((voice: Voice) => {
    if (!voice.previewUrl) {
      setErrors((current) => ({
        ...current,
        [voice.id]: "Static preview asset is not available yet.",
      }));
      return;
    }

    const source: AudioSource = {
      id: `preview:${voice.id}`,
      kind: "preview",
      url: voice.previewUrl,
      label: `${voice.displayName} preview`,
    };

    audioManager.toggle(source);
  }, [audioManager]);

  const markPreviewError = useCallback((voiceId: string) => {
    setErrors((current) => ({
      ...current,
      [voiceId]: "Preview file is missing or could not be played.",
    }));
  }, []);

  return {
    activePreviewId:
      audioManager.state.activeKind === "preview"
        ? audioManager.state.activeId?.replace("preview:", "")
        : undefined,
    isPlaying: audioManager.state.isPlaying,
    errors,
    preview,
    markPreviewError,
  };
}
