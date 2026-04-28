"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type AudioKind = "preview" | "result";

export interface AudioSource {
  id: string;
  kind: AudioKind;
  url: string;
  label: string;
}

export interface AudioState {
  activeId?: string;
  activeKind?: AudioKind;
  label?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  error?: string;
}

const initialState: AudioState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
};

export function useAudioManager() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioState>(initialState);

  useEffect(() => {
    const audio = new Audio();
    audio.preload = "metadata";
    audio.volume = initialState.volume;
    audioRef.current = audio;

    const handleTime = () => {
      setState((current) => ({
        ...current,
        currentTime: audio.currentTime,
        duration: Number.isFinite(audio.duration) ? audio.duration : 0,
      }));
    };

    const handleEnded = () => {
      setState((current) => ({
        ...current,
        isPlaying: false,
        currentTime: 0,
      }));
    };

    const handleError = () => {
      setState((current) => ({
        ...current,
        isPlaying: false,
        error: "Audio could not be loaded. The link may be stale or unavailable.",
      }));
    };

    audio.addEventListener("timeupdate", handleTime);
    audio.addEventListener("loadedmetadata", handleTime);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", handleTime);
      audio.removeEventListener("loadedmetadata", handleTime);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audioRef.current = null;
    };
  }, []);

  const play = useCallback(async (source: AudioSource) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    if (state.activeId !== source.id || audio.src !== source.url) {
      audio.pause();
      audio.src = source.url;
      audio.currentTime = 0;
    }

    try {
      await audio.play();
      setState((current) => ({
        ...current,
        activeId: source.id,
        activeKind: source.kind,
        label: source.label,
        isPlaying: true,
        error: undefined,
      }));
    } catch {
      setState((current) => ({
        ...current,
        activeId: source.id,
        activeKind: source.kind,
        label: source.label,
        isPlaying: false,
        error: "Audio playback was blocked or failed.",
      }));
    }
  }, [state.activeId]);

  const pause = useCallback(() => {
    audioRef.current?.pause();
    setState((current) => ({ ...current, isPlaying: false }));
  }, []);

  const toggle = useCallback((source: AudioSource) => {
    if (state.activeId === source.id && state.isPlaying) {
      pause();
      return;
    }

    void play(source);
  }, [pause, play, state.activeId, state.isPlaying]);

  const seek = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.currentTime = time;
    setState((current) => ({ ...current, currentTime: time }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    const clamped = Math.min(1, Math.max(0, volume));
    if (audioRef.current) {
      audioRef.current.volume = clamped;
    }
    setState((current) => ({ ...current, volume: clamped }));
  }, []);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setState((current) => ({
      ...current,
      activeId: undefined,
      activeKind: undefined,
      label: undefined,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      error: undefined,
    }));
  }, []);

  return {
    state,
    play,
    pause,
    toggle,
    seek,
    setVolume,
    stop,
  };
}
