"use client";

import {
  AlertCircle,
  Download,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { useAudioManager } from "@/hooks/use-audio-manager";
import { formatTime } from "@/components/studio/studio-helpers";
import type { LocalGeneration } from "@/types/tts";

interface AudioPlayerProps {
  generation: LocalGeneration;
  audio: ReturnType<typeof useAudioManager>;
  onRegenerate: () => void;
  onClose: () => void;
}

export function AudioPlayer({
  generation,
  audio,
  onRegenerate,
  onClose,
}: AudioPlayerProps) {
  const source = {
    id: `result:${generation.id}`,
    kind: "result" as const,
    url: generation.audioUrl,
    label: generation.fileName ?? "Generated audio",
  };
  const isActive = audio.state.activeId === source.id;
  const isPlaying = isActive && audio.state.isPlaying;
  // Use a safe duration: only trust audio.state.duration when the active source
  // matches and is finite. Otherwise the seek slider becomes meaningless.
  const duration =
    isActive && Number.isFinite(audio.state.duration) && audio.state.duration > 0
      ? audio.state.duration
      : 0;
  const currentTime = isActive ? Math.min(audio.state.currentTime, duration || 0) : 0;
  const playbackBlocked = isActive && Boolean(audio.state.error);
  const seekDisabled = !isActive || duration <= 0 || playbackBlocked;
  const isBlobUrl = generation.audioUrl.startsWith("blob:");

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-3 py-2.5 backdrop-blur sm:px-4 sm:py-3">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Button
            type="button"
            size="icon"
            className="shrink-0 bg-theme-primary text-white hover:bg-theme-primary-hover"
            onClick={() => audio.toggle(source)}
            aria-label={isPlaying ? "Pause generated audio" : "Play generated audio"}
            disabled={playbackBlocked}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold sm:text-sm">
              {generation.fileName ?? "Generated speech"}
            </p>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="w-9 text-[10px] tabular-nums text-muted-foreground sm:w-10 sm:text-xs">
                {formatTime(currentTime)}
              </span>
              <input
                className="w-full accent-[var(--theme-primary)] disabled:opacity-50"
                type="range"
                min={0}
                max={duration || 1}
                step={0.1}
                value={currentTime}
                disabled={seekDisabled}
                aria-label="Seek audio"
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (Number.isFinite(next) && duration > 0) {
                    audio.seek(Math.min(Math.max(next, 0), duration));
                  }
                }}
              />
              <span className="w-9 text-[10px] tabular-nums text-muted-foreground sm:w-10 sm:text-xs">
                {formatTime(duration)}
              </span>
            </div>
            {isActive && audio.state.error ? (
              <div className="mt-1 flex items-start gap-1.5 text-xs text-red-700">
                <AlertCircle size={12} aria-hidden="true" className="mt-0.5 shrink-0" />
                <span>
                  {audio.state.error}{" "}
                  {isBlobUrl ? (
                    "This audio was generated in this session — regenerate to recover."
                  ) : (
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-red-900"
                      onClick={onRegenerate}
                    >
                      Regenerate to recover.
                    </button>
                  )}
                </span>
              </div>
            ) : null}
          </div>
          {/* Close button visible inline on mobile so the bottom row stays compact */}
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close audio player"
            className="shrink-0 sm:hidden"
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <Volume2
            size={15}
            className="hidden text-muted-foreground sm:block"
            aria-hidden="true"
          />
          <input
            className="hidden w-20 accent-[var(--theme-primary)] sm:block"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.state.volume}
            onChange={(event) => audio.setVolume(Number(event.target.value))}
            aria-label="Audio volume"
          />
          <a
            className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted aria-disabled:cursor-not-allowed aria-disabled:opacity-50 sm:flex-none"
            href={generation.audioUrl}
            download={generation.fileName ?? "threezinc-studio-audio.mp3"}
            target="_blank"
            rel="noreferrer"
            aria-disabled={playbackBlocked || undefined}
          >
            <Download size={14} aria-hidden="true" />
            <span>Download</span>
          </a>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRegenerate}
            className="flex-1 sm:flex-none"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>Regenerate</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close audio player"
            className="hidden sm:inline-flex"
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}
