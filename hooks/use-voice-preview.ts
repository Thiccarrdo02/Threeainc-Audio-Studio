"use client";

import { useCallback, useState } from "react";

import type { AudioSource, useAudioManager } from "@/hooks/use-audio-manager";
import type { Voice } from "@/types/tts";

type AudioManager = ReturnType<typeof useAudioManager>;
export type PreviewLanguage = "english" | "hindi";

export function useVoicePreview(audioManager: AudioManager) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const preview = useCallback((voice: Voice, language: PreviewLanguage) => {
    const previewUrl = voice.previewUrls[language] || voice.previewUrl;
    const previewId = `${voice.id}:${language}`;

    if (!previewUrl) {
      setErrors((current) => ({
        ...current,
        [previewId]: "Static preview asset is not available yet.",
      }));
      return;
    }

    const source: AudioSource = {
      id: `preview:${previewId}`,
      kind: "preview",
      url: previewUrl,
      label: `${voice.displayName} ${language} preview`,
    };

    audioManager.toggle(source);
  }, [audioManager]);

  const markPreviewError = useCallback((previewId: string) => {
    setErrors((current) => ({
      ...current,
      [previewId]: "Preview file is missing or could not be played.",
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
