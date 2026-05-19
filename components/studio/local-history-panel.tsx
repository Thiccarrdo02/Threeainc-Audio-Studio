"use client";

import { Clock3, Trash2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import type { LocalGeneration, LocalScript } from "@/types/tts";

interface LocalHistoryPanelProps {
  generations: LocalGeneration[];
  scripts: LocalScript[];
  isLoading?: boolean;
  onLoadScript: (script: LocalScript) => void;
  onLoadGeneration: (generation: LocalGeneration) => void;
  onDeleteScript?: (script: LocalScript) => void;
  onDeleteGeneration?: (generation: LocalGeneration) => void;
}

export function LocalHistoryPanel({
  generations,
  scripts,
  isLoading,
  onLoadScript,
  onLoadGeneration,
  onDeleteScript,
  onDeleteGeneration,
}: LocalHistoryPanelProps) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Local History</h2>
        <p className="text-xs text-muted-foreground">
          Saved on this browser. Custom voice audio under 4&nbsp;MB is stored inline so it survives reloads.
        </p>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </>
        ) : generations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No generations yet.
          </div>
        ) : (
          generations.slice(0, 5).map((generation) => (
            <div
              key={generation.id}
              className="group flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 transition hover:border-theme-primary"
            >
              <button
                type="button"
                className="min-w-0 flex-1 text-left"
                onClick={() => onLoadGeneration(generation)}
              >
                <p className="line-clamp-1 text-sm font-medium">
                  {generation.prompt}
                </p>
                <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 size={12} aria-hidden="true" />
                  {new Date(generation.createdAt).toLocaleString()}
                </p>
              </button>
              {onDeleteGeneration ? (
                <button
                  type="button"
                  aria-label="Delete generation"
                  className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteGeneration(generation);
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Saved scripts
        </p>
        {isLoading ? (
          <>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </>
        ) : scripts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            No saved scripts.
          </div>
        ) : (
          scripts.slice(0, 5).map((script) => (
            <div
              key={script.id}
              className="group flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 transition hover:border-theme-primary"
            >
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left text-sm"
                onClick={() => onLoadScript(script)}
                title={script.title}
              >
                {script.title}
              </button>
              {onDeleteScript ? (
                <button
                  type="button"
                  aria-label={`Delete script ${script.title}`}
                  className="rounded p-1 text-muted-foreground opacity-0 transition hover:bg-muted hover:text-red-600 group-hover:opacity-100 focus:opacity-100"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDeleteScript(script);
                  }}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </button>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
