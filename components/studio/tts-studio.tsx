"use client";

import {
  AlertCircle,
  Mic2,
  Save,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EXPRESSIVE_TAGS } from "@/config/expressive-tags";
import { CustomVoiceLab } from "@/components/studio/custom-voice-lab";
import { VoicePicker } from "@/components/studio/voice-picker";
import {
  LONG_SCRIPT_WARNING_CHARACTERS,
  MAX_SCRIPT_TITLE_LENGTH,
  MAX_VOICE_NAME_LENGTH,
  STATUS_TOAST_DURATION_MS,
} from "@/config/limits";
import { MVP_LANGUAGES, toProviderLanguageCode } from "@/config/languages";
import {
  ACCENT_PRESETS,
  PACE_PRESETS,
  TONE_PRESETS,
} from "@/config/style-presets";
import { MVP_VOICES } from "@/config/voices";
import { AudioPlayer } from "@/components/studio/audio-player";
import { LocalHistoryPanel } from "@/components/studio/local-history-panel";
import {
  accentStrengthLabel,
  autoMarkupPrompt,
  buildMultiSpeakerTemplate,
  composeStyleInstructions,
  getVoiceName,
  isMvpSelected,
  languageOptionLabel,
  promptHasSpeakerPrefixes,
  speakerButtonLabel,
} from "@/components/studio/studio-helpers";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { useAudioManager } from "@/hooks/use-audio-manager";
import { useTTSGeneration } from "@/hooks/use-tts-generation";
import { useVoicePreview } from "@/hooks/use-voice-preview";
import {
  estimateCreditsFromCostUsd,
  estimateCustomVoiceTextCostUsd,
  estimatePromptCredits,
  formatCredits,
} from "@/lib/cost";
import {
  STORAGE_QUOTA_EVENT,
  clientStore,
  makeLocalId,
} from "@/lib/client-store";
import { friendlyError } from "@/lib/error-messages";
import {
  libraryVoiceToProfile,
  mergeVoiceProfiles,
  previewLanguageForCode,
  type SharedLibraryVoice,
  type VoiceRef,
} from "@/lib/voice-utils";
import type { CustomVoiceProfile } from "@/types/custom-voices";
import type {
  LocalGeneration,
  LocalScript,
  Speaker,
  StudioState,
  TTSOutputFormat,
} from "@/types/tts";

const defaultStudioState: StudioState = {
  mode: "single",
  prompt: "",
  styleInstructions: "",
  voiceId: "Kore",
  provider: "gemini",
  languageCode: "auto",
  outputFormat: "mp3",
  temperature: 1,
  accentPreset: "neutral",
  accentStrength: 45,
  tonePreset: "natural",
  pacePreset: "steady",
  speakers: [
    { speaker_id: "Speaker1", voice: "Kore" },
    { speaker_id: "Speaker2", voice: "Puck" },
  ],
};

const OUTPUT_FORMAT_OPTIONS: Array<{
  value: TTSOutputFormat;
  label: string;
  description: string;
}> = [
  { value: "mp3", label: "MP3", description: "Small, shareable" },
  { value: "wav", label: "WAV", description: "Studio quality" },
  { value: "ogg_opus", label: "Opus", description: "Efficient web audio" },
];

async function readRouteError(response: Response) {
  try {
    const data = await response.json();
    return data?.error?.message ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

async function fetchCustomVoiceLibrary() {
  const response = await fetch("/api/custom-voices");
  if (!response.ok) {
    throw new Error(await readRouteError(response));
  }
  const data = (await response.json()) as { voices: CustomVoiceProfile[] };
  return data.voices;
}

async function fetchSharedLibraryVoices(): Promise<SharedLibraryVoice[]> {
  const response = await fetch("/api/custom-voices/library");
  if (!response.ok) {
    throw new Error(await readRouteError(response));
  }
  const data = (await response.json()) as { voices: SharedLibraryVoice[] };
  return data.voices ?? [];
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </label>
  );
}

type StudioWorkspace = "tts" | "voice-cloning";

function TopBar({
  mode,
  workspace,
  characterCount,
  onWorkspaceChange,
  onModeChange,
}: {
  mode: StudioState["mode"];
  workspace: StudioWorkspace;
  characterCount: number;
  onWorkspaceChange: (workspace: StudioWorkspace) => void;
  onModeChange: (mode: StudioState["mode"]) => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex min-h-14 max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 sm:gap-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-theme-gradient-button text-white shadow-[0_4px_16px_var(--theme-primary-shadow-md)]">
            <Mic2 size={17} aria-hidden="true" />
          </div>
          <div>
            <p className="font-heading text-base font-semibold">Audio Studio</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              {workspace === "tts"
                ? "Generate, refine, and ship voice with one click"
                : "Design Voice — clone, design, and remix in your voice lab"}
            </p>
          </div>
        </div>

        <div className="order-3 flex w-full rounded-md border border-border bg-card p-0.5 sm:order-none sm:w-auto">
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition sm:flex-none ${
              workspace === "tts"
                ? "bg-theme-primary text-white shadow-[0_2px_10px_var(--theme-primary-shadow-sm)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
            onClick={() => onWorkspaceChange("tts")}
            aria-label="Open Studio"
          >
            <Mic2 size={13} aria-hidden="true" />
            Studio
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition sm:flex-none ${
              workspace === "voice-cloning"
                ? "bg-theme-primary text-white shadow-[0_2px_10px_var(--theme-primary-shadow-sm)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            type="button"
            onClick={() => onWorkspaceChange("voice-cloning")}
            aria-label="Open Voice Lab"
          >
            <Sparkles size={13} aria-hidden="true" />
            Voice Lab
            <span className="hidden text-[10px] uppercase tracking-wide opacity-70 sm:inline">
              · Design Voice
            </span>
          </button>
        </div>

        {workspace === "tts" ? (
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border bg-card p-0.5">
              <button
                className={`rounded px-3 py-1 text-xs font-medium transition ${
                  mode === "single"
                    ? "bg-theme-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
                onClick={() => onModeChange("single")}
              >
                Single Voice
              </button>
              <button
                className={`rounded px-3 py-1 text-xs font-medium transition ${
                  mode === "multi"
                    ? "bg-theme-primary text-white"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                type="button"
                onClick={() => onModeChange("multi")}
              >
                Multi-Speaker
              </button>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground tabular-nums">
              {characterCount.toLocaleString()} chars
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Voice Lab workspace
          </div>
        )}
      </div>
    </header>
  );
}

function CreditEstimator({ prompt }: { prompt: string }) {
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <Sparkles size={14} aria-hidden="true" />
      <span>Estimated {formatCredits(estimatePromptCredits(prompt))}</span>
    </div>
  );
}

function TagInserter({ onInsert }: { onInsert: (tag: string) => void }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Emotion Tags</FieldLabel>
        <span className="text-xs text-muted-foreground">
          Per-line emotion and pauses
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {EXPRESSIVE_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground transition hover:border-theme-primary hover:text-theme-primary"
            onClick={() => onInsert(tag)}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

interface ExpressionPreview {
  before: string;
  after: string;
}

function ScriptEditor({
  prompt,
  mode,
  speakers,
  onPromptChange,
  onRequestExpressionPreview,
}: {
  prompt: string;
  mode: StudioState["mode"];
  speakers: Speaker[];
  onPromptChange: (value: string) => void;
  onRequestExpressionPreview: (preview: ExpressionPreview | null) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [autoExpressionStatus, setAutoExpressionStatus] = useState("");

  const insertText = useCallback((text: string, forceLineStart = false) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onPromptChange(`${prompt}${prompt && forceLineStart ? "\n" : ""}${text}`);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const needsLeadingBreak =
      forceLineStart && start > 0 && prompt[start - 1] !== "\n";
    const insertion = `${needsLeadingBreak ? "\n" : ""}${text}`;
    const next = `${prompt.slice(0, start)}${insertion}${prompt.slice(end)}`;
    onPromptChange(next);
    window.requestAnimationFrame(() => {
      textarea.focus();
      const cursor = start + insertion.length;
      textarea.setSelectionRange(cursor, cursor);
    });
  }, [onPromptChange, prompt]);

  const insertTag = useCallback((tag: string) => {
    insertText(`${tag} `);
  }, [insertText]);

  const insertSpeaker = useCallback((speaker: Speaker) => {
    const alias = speaker.speaker_id || "Speaker";
    insertText(`${alias}: `, true);
  }, [insertText]);

  const autoAddExpressions = useCallback(() => {
    const nextPrompt = autoMarkupPrompt(prompt);
    if (nextPrompt === prompt) {
      setAutoExpressionStatus("Script already has expression cues.");
      return;
    }
    onRequestExpressionPreview({ before: prompt, after: nextPrompt });
  }, [onRequestExpressionPreview, prompt]);

  const handlePromptChange = useCallback((value: string) => {
    setAutoExpressionStatus("");
    onPromptChange(value);
  }, [onPromptChange]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Script</FieldLabel>
        <CreditEstimator prompt={prompt} />
      </div>
      {mode === "multi" ? (
        <div className="flex flex-wrap gap-1.5">
          {speakers.map((speaker, index) => (
            <button
              key={`${speaker.speaker_id}-${index}`}
              type="button"
              className="inline-flex items-center gap-1 rounded border border-theme-primary bg-[var(--theme-primary-light)] px-2 py-1 text-xs font-medium text-theme-primary transition hover:bg-[var(--theme-primary-medium)]"
              onClick={() => insertSpeaker(speaker)}
            >
              <UserRoundCheck size={12} aria-hidden="true" />
              {speakerButtonLabel(speaker, index)}
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        ref={textareaRef}
        className="min-h-[260px] w-full resize-y rounded-lg border border-border bg-card px-3 py-3 text-sm leading-6 outline-none transition placeholder:text-muted-foreground/70 focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
        value={prompt}
        onChange={(event) => handlePromptChange(event.target.value)}
        placeholder={
          mode === "multi"
            ? "Write a dialogue using the speaker chips above (e.g. Speaker1: Hello there)."
            : "Write the spoken script here. Add expressive tags like [excited] or [short pause] where they should influence delivery."
        }
      />
      {prompt.length > LONG_SCRIPT_WARNING_CHARACTERS ? (
        <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle size={14} aria-hidden="true" />
          Long scripts may reduce quality. Consider splitting.
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={autoAddExpressions}
          disabled={!prompt.trim()}
        >
          <Wand2 size={14} aria-hidden="true" />
          Auto-add expressions
        </Button>
        <span className="text-xs text-muted-foreground">
          {autoExpressionStatus || "We preview every change before applying it."}
        </span>
      </div>
      <TagInserter onInsert={insertTag} />
    </section>
  );
}

function StudioControls({
  state,
  speakerIssues,
  onChange,
  onRequestExpressionPreview,
  onInsertTemplate,
}: {
  state: StudioState;
  speakerIssues: string[];
  onChange: (state: StudioState) => void;
  onRequestExpressionPreview: (preview: ExpressionPreview | null) => void;
  onInsertTemplate: () => void;
}) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px]">
        <div className="space-y-1.5">
          <FieldLabel>Language</FieldLabel>
          <select
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={state.languageCode}
            aria-label="Generation language"
            onChange={(event) =>
              onChange({ ...state, languageCode: event.target.value })
            }
          >
            {MVP_LANGUAGES.map((language) => (
              <option key={language.id} value={language.id}>
                {languageOptionLabel(language)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Output</FieldLabel>
          <select
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={state.outputFormat}
            aria-label="Output format"
            onChange={(event) =>
              onChange({
                ...state,
                outputFormat: event.target.value as TTSOutputFormat,
              })
            }
          >
            {OUTPUT_FORMAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label} - {option.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.mode === "multi" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-primary bg-[var(--theme-primary-light)] px-3 py-2 text-sm font-medium text-theme-primary">
          <span>Multi-speaker mode uses exactly two speakers.</span>
          {!state.prompt.trim() ? (
            <Button
              type="button"
              size="xs"
              variant="outline"
              onClick={onInsertTemplate}
            >
              Insert example
            </Button>
          ) : null}
        </div>
      ) : null}

      {state.mode === "multi" ? (
        <MultiSpeakerBuilder
          speakers={state.speakers}
          issues={speakerIssues}
          onChange={(speakers) => onChange({ ...state, speakers })}
        />
      ) : null}

      <ScriptEditor
        prompt={state.prompt}
        mode={state.mode}
        speakers={state.speakers}
        onPromptChange={(prompt) => onChange({ ...state, prompt })}
        onRequestExpressionPreview={onRequestExpressionPreview}
      />

      <section className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-theme-primary" aria-hidden="true" />
          <FieldLabel>Delivery Style</FieldLabel>
        </div>
        <p className="text-xs text-muted-foreground">
          Voice selection fixes the speaker identity. These settings guide the performance.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <FieldLabel>Accent Direction</FieldLabel>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={state.accentPreset}
              aria-label="Accent preset"
              onChange={(event) =>
                onChange({ ...state, accentPreset: event.target.value })
              }
            >
              {ACCENT_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Voice Personality</FieldLabel>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={state.tonePreset}
              aria-label="Tone preset"
              onChange={(event) =>
                onChange({ ...state, tonePreset: event.target.value })
              }
            >
              {TONE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <FieldLabel>Pace</FieldLabel>
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={state.pacePreset}
              aria-label="Pace preset"
              onChange={(event) =>
                onChange({ ...state, pacePreset: event.target.value })
              }
            >
              {PACE_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background/70">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-medium"
            onClick={() => setShowAdvanced((current) => !current)}
            aria-expanded={showAdvanced}
          >
            <span>Advanced Controls</span>
            <span className="text-xs text-muted-foreground">
              {showAdvanced ? "Hide" : "Show"}
            </span>
          </button>
          {showAdvanced ? (
            <div className="space-y-3 border-t border-border px-3 py-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Accent Strength</FieldLabel>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {accentStrengthLabel(state.accentStrength)} · {state.accentStrength}%
                    </span>
                  </div>
                  <input
                    className="w-full accent-[var(--theme-primary)]"
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={state.accentStrength}
                    onChange={(event) =>
                      onChange({
                        ...state,
                        accentStrength: Number(event.target.value),
                      })
                    }
                    aria-label="Accent strength"
                  />
                  <p className="text-xs text-muted-foreground">
                    Higher values make the selected accent more noticeable.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <FieldLabel>Creativity</FieldLabel>
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">
                      {state.temperature.toFixed(1)}
                    </span>
                  </div>
                  <input
                    className="w-full accent-[var(--theme-primary)]"
                    type="range"
                    min={0}
                    max={2}
                    step={0.1}
                    value={state.temperature}
                    onChange={(event) =>
                      onChange({ ...state, temperature: Number(event.target.value) })
                    }
                    aria-label="Generation creativity"
                  />
                  <p className="text-xs text-muted-foreground">
                    Lower is steadier. Higher allows more delivery variation.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Custom Direction</FieldLabel>
                <input
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={state.styleInstructions}
                  onChange={(event) =>
                    onChange({ ...state, styleInstructions: event.target.value })
                  }
                  placeholder="Example: Speak clearly, confident, slightly upbeat."
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function MultiSpeakerBuilder({
  speakers,
  issues,
  onChange,
}: {
  speakers: StudioState["speakers"];
  issues: string[];
  onChange: (speakers: StudioState["speakers"]) => void;
}) {
  const updateSpeaker = (
    index: number,
    patch: Partial<StudioState["speakers"][number]>,
  ) => {
    onChange(
      speakers.map((speaker, speakerIndex) =>
        speakerIndex === index ? { ...speaker, ...patch } : speaker,
      ),
    );
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>Speaker Labels</FieldLabel>
        <span className="text-xs text-muted-foreground">
          Voices are assigned from the catalog.
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {speakers.map((speaker, index) => (
          <div
            key={index}
            className="rounded-lg border border-border bg-card p-3"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="font-heading text-sm font-semibold">
                Speaker {index + 1}
              </p>
              <span className="truncate text-xs text-muted-foreground">
                {getVoiceName(speaker.voice)}
              </span>
            </div>
            <div className="grid gap-2">
              <input
                className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                value={speaker.speaker_id}
                onChange={(event) =>
                  updateSpeaker(index, { speaker_id: event.target.value })
                }
                aria-label={`Speaker ${index + 1} alias`}
              />
            </div>
          </div>
        ))}
      </div>
      {issues.length > 0 ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {issues.join(" ")}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Click the speaker chips above the script box to insert prefixes.
        </p>
      )}
    </section>
  );
}

function GenerationPanel({
  state,
  selectedVoiceName,
  selectedVoiceReady,
  speakerIssues,
  promptValidationIssue,
  generationError,
  isGenerating,
  onGenerate,
  onSaveScript,
  onDismissError,
}: {
  state: StudioState;
  selectedVoiceName: string;
  selectedVoiceReady: boolean;
  speakerIssues: string[];
  promptValidationIssue?: string;
  generationError?: { code: string; message: string; retryable: boolean };
  isGenerating: boolean;
  onGenerate: () => void;
  onSaveScript: () => void;
  onDismissError: () => void;
}) {
  const canGenerate =
    state.prompt.trim().length > 0 &&
    !isGenerating &&
    speakerIssues.length === 0 &&
    !promptValidationIssue &&
    selectedVoiceReady;
  const characterCount = state.prompt.trim().length;
  const languageLabel =
    MVP_LANGUAGES.find((language) => language.id === state.languageCode)?.label ??
    "Auto-detect";
  const accentLabel =
    ACCENT_PRESETS.find((preset) => preset.id === state.accentPreset)?.label ??
    "Neutral";
  const personalityLabel =
    TONE_PRESETS.find((preset) => preset.id === state.tonePreset)?.label ??
    "Natural";
  const paceLabel =
    PACE_PRESETS.find((preset) => preset.id === state.pacePreset)?.label ??
    "Steady";

  const speakerSummary =
    state.mode === "multi"
      ? state.speakers
          .map((speaker) => {
            const voice =
              MVP_VOICES.find((item) => item.id === speaker.voice)?.displayName ??
              speaker.voice;
            return `${speaker.speaker_id || "Speaker"}: ${voice}`;
          })
          .join(" | ")
      : selectedVoiceName;
  const credits =
    state.provider === "custom" && state.mode === "single"
      ? estimateCreditsFromCostUsd(
          estimateCustomVoiceTextCostUsd(characterCount),
        )
      : estimatePromptCredits(state.prompt);

  const friendly = generationError ? friendlyError(generationError) : null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Generate</h2>
        <p className="text-xs text-muted-foreground">
          Review the selected voice, script size, and ThreeZinc credits.
        </p>
      </div>

      <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Voice</span>
          <span className="text-right font-medium">{speakerSummary}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Language</span>
          <span className="text-right font-medium">{languageLabel}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Output</span>
          <span className="text-right font-medium">{state.outputFormat.toUpperCase()}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Delivery</span>
          <span className="text-right font-medium">
            {accentLabel} | {personalityLabel} | {paceLabel}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Credits</span>
          <span className="text-right font-medium tabular-nums">
            {characterCount.toLocaleString()} chars · {formatCredits(credits)}
          </span>
        </div>
      </div>

      {friendly ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{friendly.title}</p>
              <p>{friendly.detail}</p>
              <p className="mt-0.5 text-[10px] uppercase tracking-wide text-red-700/70">
                {generationError?.code}
              </p>
            </div>
            <button
              type="button"
              aria-label="Dismiss error"
              className="rounded p-0.5 text-red-700 transition hover:bg-red-100"
              onClick={onDismissError}
            >
              ×
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className="w-full bg-theme-gradient-button text-white shadow-[0_4px_16px_var(--theme-primary-glow)] hover:brightness-105"
        >
          {isGenerating ? "Generating..." : "Generate Audio"}
        </Button>
        <Button type="button" variant="outline" onClick={onSaveScript}>
          <Save size={14} aria-hidden="true" />
          Save script
        </Button>
        {!state.prompt.trim() ? (
          <span className="text-xs text-muted-foreground">
            {state.mode === "multi"
              ? "Tap “Insert example” above to start a dialogue, or use the speaker chips."
              : "Add a script to enable generation."}
          </span>
        ) : null}
        {state.prompt.trim() && promptValidationIssue ? (
          <span className="text-xs text-amber-700">{promptValidationIssue}</span>
        ) : null}
        {!selectedVoiceReady ? (
          <span className="text-xs text-muted-foreground">
            Select a saved custom voice or a built-in voice.
          </span>
        ) : null}
        {speakerIssues.length > 0 ? (
          <span className="text-xs text-red-700">{speakerIssues[0]}</span>
        ) : null}
      </div>
    </section>
  );
}

interface RenamingVoiceState {
  voice: CustomVoiceProfile;
}

interface ConfirmDeleteState {
  voice: CustomVoiceProfile;
}

export function TTSStudio() {
  const [hydrated, setHydrated] = useState(false);
  const [workspace, setWorkspace] = useState<StudioWorkspace>("tts");
  const [state, setState] = useState<StudioState>(defaultStudioState);
  const [scripts, setScripts] = useState<LocalScript[]>([]);
  const [generations, setGenerations] = useState<LocalGeneration[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<LocalGeneration | undefined>();
  const [savedCustomVoices, setSavedCustomVoices] = useState<CustomVoiceProfile[]>([]);
  const [libraryVoices, setLibraryVoices] = useState<CustomVoiceProfile[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [statusToast, setStatusToast] = useState<{
    message: string;
    tone: "success" | "info" | "error";
  } | null>(null);
  const [libraryError, setLibraryError] = useState("");
  const [renamingVoice, setRenamingVoice] = useState<RenamingVoiceState | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ConfirmDeleteState | null>(null);
  const [expressionPreview, setExpressionPreview] = useState<ExpressionPreview | null>(null);
  const [scriptToDelete, setScriptToDelete] = useState<LocalScript | null>(null);
  const [generationToDelete, setGenerationToDelete] = useState<LocalGeneration | null>(null);

  const audio = useAudioManager();
  const preview = useVoicePreview(audio);
  const generation = useTTSGeneration();

  const customVoices = useMemo(
    () => mergeVoiceProfiles(savedCustomVoices, libraryVoices),
    [savedCustomVoices, libraryVoices],
  );

  const selectedVoice = useMemo(
    () => MVP_VOICES.find((voice) => voice.id === state.voiceId) ?? MVP_VOICES[0],
    [state.voiceId],
  );
  const selectedCustomVoice = useMemo(
    () => customVoices.find((voice) => voice.voiceId === state.voiceId),
    [customVoices, state.voiceId],
  );
  const selectedVoiceName =
    state.provider === "custom"
      ? selectedCustomVoice?.name ?? "Select a custom voice"
      : selectedVoice.displayName;

  const selectedVoiceRef: VoiceRef =
    state.provider === "custom"
      ? { kind: "custom", id: state.voiceId }
      : { kind: "builtin", id: state.voiceId };

  const previewLanguage = useMemo(
    () => previewLanguageForCode(state.languageCode),
    [state.languageCode],
  );

  const speakerIssues = useMemo(() => {
    if (state.mode !== "multi") {
      return [];
    }

    const issues: string[] = [];
    const aliases = state.speakers.map((speaker) => speaker.speaker_id.trim());

    if (state.speakers.length !== 2) {
      issues.push("Multi-speaker mode requires exactly two speakers.");
    }

    aliases.forEach((alias, index) => {
      if (!/^[A-Za-z0-9]+$/.test(alias)) {
        issues.push(`Speaker ${index + 1} alias must be alphanumeric.`);
      }
    });

    if (new Set(aliases).size !== aliases.length) {
      issues.push("Speaker aliases must be unique.");
    }

    return issues;
  }, [state.mode, state.speakers]);

  // Validate that multi-speaker prompts actually use the configured prefixes
  // before letting the user generate — otherwise Fal rejects the request and
  // the user only finds out after waiting.
  const promptValidationIssue = useMemo(() => {
    if (state.mode !== "multi") return undefined;
    if (!state.prompt.trim()) return undefined;
    if (!promptHasSpeakerPrefixes(state.prompt, state.speakers)) {
      return `Multi-speaker scripts need lines starting with ${state.speakers
        .map((s) => `"${s.speaker_id}:"`)
        .join(" or ")}.`;
    }
    return undefined;
  }, [state.mode, state.prompt, state.speakers]);

  const refreshCustomVoices = useCallback(async () => {
    const voices = await fetchCustomVoiceLibrary();
    setSavedCustomVoices(voices);
    // Mirror the server list into localStorage so a serverless cold start
    // doesn't make the user's voices look like they vanished.
    clientStore.cacheCustomVoices(voices);
    return voices;
  }, []);

  const selectVoice = useCallback((ref: VoiceRef) => {
    setState((current) => {
      if (ref.kind === "builtin") {
        return {
          ...current,
          provider: "gemini",
          voiceId: ref.id,
        };
      }
      return {
        ...current,
        mode: "single",
        provider: "custom",
        voiceId: ref.id,
        outputFormat: "mp3",
      };
    });
  }, []);

  const renameCustomVoice = useCallback(
    (voice: CustomVoiceProfile) => {
      setRenamingVoice({ voice });
    },
    [],
  );

  const performRenameCustomVoice = useCallback(
    async (voice: CustomVoiceProfile, nextName: string) => {
      try {
        const response = await fetch(
          `/api/custom-voices/${encodeURIComponent(voice.voiceId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nextName }),
          },
        );
        if (!response.ok) {
          throw new Error(await readRouteError(response));
        }
        await refreshCustomVoices();
        setStatusToast({
          tone: "success",
          message: `Renamed “${voice.name}” to “${nextName}”.`,
        });
      } catch (error) {
        setLibraryError(
          error instanceof Error ? error.message : "Could not rename voice.",
        );
      }
    },
    [refreshCustomVoices],
  );

  const deleteCustomVoice = useCallback(
    (voice: CustomVoiceProfile) => {
      setConfirmDelete({ voice });
    },
    [],
  );

  const performDeleteCustomVoice = useCallback(
    async (voice: CustomVoiceProfile) => {
      try {
        const response = await fetch(
          `/api/custom-voices/${encodeURIComponent(voice.voiceId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          throw new Error(await readRouteError(response));
        }
        const voices = await refreshCustomVoices();
        setState((current) =>
          current.provider === "custom" && current.voiceId === voice.voiceId
            ? {
                ...current,
                provider: "gemini",
                voiceId: "Kore",
              }
            : current,
        );
        setStatusToast({
          tone: "success",
          message:
            voices.length > 0
              ? `Deleted “${voice.name}”.`
              : `Deleted “${voice.name}”. Your library is empty.`,
        });
      } catch (error) {
        setLibraryError(
          error instanceof Error ? error.message : "Could not delete voice.",
        );
      }
    },
    [refreshCustomVoices],
  );

  const changeMode = useCallback(
    (mode: StudioState["mode"]) => {
      setState((current) => {
        if (current.mode === mode) {
          return current;
        }

        if (
          mode === "multi" &&
          current.prompt.trim() &&
          !promptHasSpeakerPrefixes(current.prompt, current.speakers)
        ) {
          return {
            ...current,
            mode,
            provider: "gemini",
            voiceId: isMvpSelected(current.voiceId) ? current.voiceId : "Kore",
            prompt: `${current.speakers[0]?.speaker_id ?? "Speaker1"}: ${current.prompt}\n${current.speakers[1]?.speaker_id ?? "Speaker2"}:`,
          };
        }

        return {
          ...current,
          mode,
          ...(mode === "multi"
            ? {
                provider: "gemini" as const,
                voiceId: isMvpSelected(current.voiceId) ? current.voiceId : "Kore",
              }
            : {}),
        };
      });
    },
    [],
  );

  const insertMultiSpeakerTemplate = useCallback(() => {
    setState((current) => ({
      ...current,
      prompt: buildMultiSpeakerTemplate(current.speakers),
    }));
  }, []);

  useEffect(() => {
    void Promise.resolve().then(() => {
      setState(clientStore.getSettings(defaultStudioState));
      setScripts(clientStore.listScripts());
      const storedGenerations = clientStore.listGenerations();
      setGenerations(storedGenerations);
      setActiveGeneration(storedGenerations[0]);
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    let mounted = true;

    // Prime the UI with the locally cached snapshot before hitting the network
    // — this makes the library appear instantly and survives cold starts on
    // serverless platforms where the server-side store is ephemeral. Defer
    // through a microtask so the synchronous setState happens after mount.
    const cached = clientStore.listCachedCustomVoices();
    void Promise.resolve().then(() => {
      if (!mounted) return;
      if (cached.length > 0) {
        setSavedCustomVoices(cached);
      }
    });

    void fetchCustomVoiceLibrary()
      .then((voices) => {
        if (!mounted) return;
        // Server returned voices → use them as truth and refresh the cache.
        // Server returned empty (e.g. cold-start ephemeral cache) but we have
        // a local snapshot → keep showing the cached voices.
        if (voices.length > 0 || cached.length === 0) {
          setSavedCustomVoices(voices);
          clientStore.cacheCustomVoices(voices);
        }
      })
      .catch((error) => {
        if (!mounted) return;
        // Only surface the error if we have nothing cached either.
        if (cached.length === 0) {
          setLibraryError(
            error instanceof Error ? error.message : "Could not load voices.",
          );
        }
      });

    void fetchSharedLibraryVoices()
      .then((voices) => {
        if (!mounted) return;
        setLibraryVoices(voices.map(libraryVoiceToProfile));
      })
      .catch(() => {
        // Swallow: missing API key or transient failure.
      })
      .finally(() => {
        if (!mounted) return;
        setLoadingLibrary(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!statusToast) return;
    const handle = window.setTimeout(
      () => setStatusToast(null),
      STATUS_TOAST_DURATION_MS,
    );
    return () => window.clearTimeout(handle);
  }, [statusToast]);

  useEffect(() => {
    if (hydrated) {
      clientStore.saveSettings(state);
    }
  }, [hydrated, state]);

  // Listen for localStorage quota events from any writer.
  useEffect(() => {
    const handle = () => {
      setStatusToast({
        tone: "error",
        message:
          "Local storage is full. Delete old generations or scripts to keep saving new ones.",
      });
    };
    window.addEventListener(STORAGE_QUOTA_EVENT, handle);
    return () => window.removeEventListener(STORAGE_QUOTA_EVENT, handle);
  }, []);

  // When a fresh generation arrives and the user has the tab backgrounded,
  // flash the document title so they notice the audio is ready without having
  // to come back to the studio first. Restored on tab focus.
  useEffect(() => {
    if (!activeGeneration) return;
    if (typeof document === "undefined") return;
    if (!document.hidden) return;
    const originalTitle = document.title;
    document.title = "🔔 Audio ready — ThreeZinc Studio";
    const restore = () => {
      if (!document.hidden) {
        document.title = originalTitle;
        document.removeEventListener("visibilitychange", restore);
      }
    };
    document.addEventListener("visibilitychange", restore);
    return () => {
      document.title = originalTitle;
      document.removeEventListener("visibilitychange", restore);
    };
  }, [activeGeneration]);

  useEffect(() => {
    if (
      audio.state.activeKind === "preview" &&
      audio.state.activeId &&
      audio.state.error
    ) {
      preview.markPreviewError(audio.state.activeId.replace("preview:", ""));
    }
  }, [audio.state.activeId, audio.state.activeKind, audio.state.error, preview]);

  const saveScript = useCallback(() => {
    const now = new Date().toISOString();
    const firstLine = state.prompt
      .split("\n")
      .find(Boolean)
      ?.slice(0, MAX_SCRIPT_TITLE_LENGTH);
    const script: LocalScript = {
      id: makeLocalId("script"),
      title: firstLine || "Untitled script",
      prompt: state.prompt,
      styleInstructions: state.styleInstructions,
      mode: state.mode,
      voiceId: state.voiceId,
      provider: state.provider,
      languageCode: state.languageCode,
      outputFormat: state.outputFormat,
      temperature: state.temperature,
      accentPreset: state.accentPreset,
      accentStrength: state.accentStrength,
      tonePreset: state.tonePreset,
      pacePreset: state.pacePreset,
      createdAt: now,
      updatedAt: now,
    };
    const ok = clientStore.upsertScript(script);
    setScripts(clientStore.listScripts());
    setStatusToast(
      ok
        ? { tone: "success", message: `Saved “${script.title}”.` }
        : {
            tone: "error",
            message:
              "We couldn't save this script — your local storage may be full.",
          },
    );
  }, [state]);

  const runGenerate = useCallback(() => {
    const providerLanguage = toProviderLanguageCode(state.languageCode);
    const styleInstructions = composeStyleInstructions(state);
    const provider: "gemini" | "custom" =
      state.mode === "single" && state.provider === "custom"
        ? "custom"
        : "gemini";
    if (provider === "custom" && !selectedCustomVoice) {
      return;
    }
    const baseRequest = {
      prompt: state.prompt,
      style_instructions: styleInstructions,
      provider,
      output_format: provider === "custom" ? "mp3" as const : state.outputFormat,
      temperature: state.temperature,
      ...(provider === "gemini" && providerLanguage
        ? { language_code: providerLanguage }
        : {}),
    };
    const request =
      state.mode === "multi"
        ? {
            ...baseRequest,
            mode: "multi" as const,
            speakers: state.speakers.map((speaker) => ({
              speaker_id: speaker.speaker_id.trim(),
              voice: speaker.voice,
            })),
          }
        : {
            ...baseRequest,
            mode: "single" as const,
            voice:
              provider === "custom"
                ? selectedCustomVoice?.voiceId
                : state.voiceId,
          };

    void generation.generate(request).then((item) => {
      if (item) {
        setActiveGeneration(item);
        setGenerations(clientStore.listGenerations());
        const summary =
          item.prompt.trim().split(/\s+/).slice(0, 6).join(" ") ||
          item.fileName ||
          "your script";
        setStatusToast({
          tone: "success",
          message: `New audio ready — "${summary}${
            summary.length < item.prompt.length ? "…" : ""
          }". Use the player at the bottom to listen.`,
        });
      }
    });
  }, [generation, selectedCustomVoice, state]);

  const loadScript = useCallback((script: LocalScript) => {
    setState((current) => ({
      ...current,
      prompt: script.prompt,
      styleInstructions: script.styleInstructions,
      mode: script.mode,
      voiceId: script.voiceId ?? current.voiceId,
      provider: script.provider ?? current.provider,
      languageCode: script.languageCode ?? current.languageCode,
      outputFormat: script.outputFormat ?? current.outputFormat,
      temperature: script.temperature ?? current.temperature,
      accentPreset: script.accentPreset ?? current.accentPreset,
      accentStrength: script.accentStrength ?? current.accentStrength,
      tonePreset: script.tonePreset ?? current.tonePreset,
      pacePreset: script.pacePreset ?? current.pacePreset,
    }));
  }, []);

  const loadGeneration = useCallback((item: LocalGeneration) => {
    setActiveGeneration(item);
    setState((current) => ({
      ...current,
      prompt: item.prompt,
      styleInstructions: item.styleInstructions ?? "",
      mode: item.mode,
      voiceId: item.voiceId ?? current.voiceId,
      provider: item.provider,
      languageCode: item.languageCode ?? current.languageCode,
      outputFormat: item.outputFormat ?? current.outputFormat,
      temperature: item.temperature ?? current.temperature,
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,var(--theme-accent-soft),transparent_28%),linear-gradient(180deg,var(--theme-primary-light),transparent_280px)] pb-40 text-foreground sm:pb-28">
      <TopBar
        mode={state.mode}
        workspace={workspace}
        characterCount={state.prompt.length}
        onWorkspaceChange={setWorkspace}
        onModeChange={changeMode}
      />
      {workspace === "tts" ? (
        <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 lg:grid-cols-[minmax(0,1fr)_390px] sm:px-6">
          <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm sm:p-5">
            <StudioControls
              state={state}
              speakerIssues={speakerIssues}
              onChange={setState}
              onRequestExpressionPreview={setExpressionPreview}
              onInsertTemplate={insertMultiSpeakerTemplate}
            />
          </section>

          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              {loadingLibrary ? (
                <div className="space-y-2">
                  <Skeleton className="h-6 w-40" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                    <Skeleton className="h-20" />
                  </div>
                </div>
              ) : (
                <VoicePicker
                  mode={state.mode}
                  visibility={state.mode === "multi" ? "builtin-only" : "all"}
                  builtinVoices={MVP_VOICES}
                  customVoices={customVoices}
                  selectedRef={selectedVoiceRef}
                  speakers={state.speakers}
                  preview={preview}
                  previewLanguage={previewLanguage}
                  loadingLibrary={loadingLibrary}
                  onSelect={selectVoice}
                  onAssignSpeaker={(speakerIndex, ref) => {
                    if (ref.kind !== "builtin") return;
                    setState((current) => ({
                      ...current,
                      provider: "gemini",
                      speakers: current.speakers.map((speaker, index) =>
                        index === speakerIndex
                          ? { ...speaker, voice: ref.id }
                          : speaker,
                      ),
                    }));
                  }}
                  onRenameCustomVoice={renameCustomVoice}
                  onDeleteCustomVoice={deleteCustomVoice}
                  subtitle={
                    state.mode === "multi"
                      ? "Multi-speaker mode uses our built-in TTS voices."
                      : "Choose the speaker identity first. Delivery settings and emotion tags shape the performance."
                  }
                />
              )}
              {libraryError ? (
                <div className="mt-2">
                  <Toast
                    tone="error"
                    message={libraryError}
                    onDismiss={() => setLibraryError("")}
                  />
                </div>
              ) : null}
            </section>
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              <GenerationPanel
                state={state}
                selectedVoiceName={selectedVoiceName}
                selectedVoiceReady={
                  state.mode === "multi" ||
                  state.provider === "gemini" ||
                  Boolean(selectedCustomVoice)
                }
                speakerIssues={speakerIssues}
                promptValidationIssue={promptValidationIssue}
                generationError={generation.error}
                isGenerating={generation.isGenerating}
                onGenerate={runGenerate}
                onSaveScript={saveScript}
                onDismissError={generation.clearError}
              />
            </section>
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              <LocalHistoryPanel
                generations={generations}
                scripts={scripts}
                isLoading={!hydrated}
                onLoadScript={loadScript}
                onLoadGeneration={loadGeneration}
                onDeleteScript={setScriptToDelete}
                onDeleteGeneration={setGenerationToDelete}
              />
            </section>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
          <CustomVoiceLab />
        </div>
      )}

      {workspace === "tts" && activeGeneration ? (
        <AudioPlayer
          generation={activeGeneration}
          audio={audio}
          onRegenerate={runGenerate}
          onClose={() => {
            audio.stop();
            setActiveGeneration(undefined);
          }}
        />
      ) : null}

      {statusToast ? (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
          <Toast
            message={statusToast.message}
            tone={statusToast.tone}
            onDismiss={() => setStatusToast(null)}
          />
        </div>
      ) : null}

      <PromptDialog
        open={Boolean(renamingVoice)}
        title="Rename voice"
        description={renamingVoice ? `Currently “${renamingVoice.voice.name}”.` : undefined}
        defaultValue={renamingVoice?.voice.name}
        placeholder="Voice name"
        confirmLabel="Save"
        maxLength={MAX_VOICE_NAME_LENGTH}
        onCancel={() => setRenamingVoice(null)}
        onConfirm={(value) => {
          const voice = renamingVoice?.voice;
          setRenamingVoice(null);
          if (voice && value !== voice.name) {
            void performRenameCustomVoice(voice, value);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        title="Delete this voice?"
        description={
          confirmDelete
            ? `“${confirmDelete.voice.name}” will be removed from your library. This can't be undone.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => {
          const voice = confirmDelete?.voice;
          setConfirmDelete(null);
          if (voice) {
            void performDeleteCustomVoice(voice);
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(scriptToDelete)}
        title="Delete saved script?"
        description={
          scriptToDelete
            ? `“${scriptToDelete.title}” will be removed from your local history.`
            : undefined
        }
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setScriptToDelete(null)}
        onConfirm={() => {
          const target = scriptToDelete;
          setScriptToDelete(null);
          if (target) {
            clientStore.deleteScript(target.id);
            setScripts(clientStore.listScripts());
          }
        }}
      />

      <ConfirmDialog
        open={Boolean(generationToDelete)}
        title="Delete this generation?"
        description="This only removes the saved record from your browser — already-downloaded files are unaffected."
        confirmLabel="Delete"
        variant="destructive"
        onCancel={() => setGenerationToDelete(null)}
        onConfirm={() => {
          const target = generationToDelete;
          setGenerationToDelete(null);
          if (target) {
            clientStore.deleteGeneration(target.id);
            setGenerations(clientStore.listGenerations());
            if (activeGeneration?.id === target.id) {
              audio.stop();
              setActiveGeneration(undefined);
            }
          }
        }}
      />

      <ExpressionPreviewDialog
        preview={expressionPreview}
        onCancel={() => setExpressionPreview(null)}
        onConfirm={(after) => {
          setState((current) => ({ ...current, prompt: after }));
          setExpressionPreview(null);
          setStatusToast({ tone: "success", message: "Expression cues added." });
        }}
      />
    </main>
  );
}

function ExpressionPreviewDialog({
  preview,
  onCancel,
  onConfirm,
}: {
  preview: ExpressionPreview | null;
  onCancel: () => void;
  onConfirm: (after: string) => void;
}) {
  useEffect(() => {
    if (!preview) return;
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handle);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handle);
      document.body.style.overflow = "";
    };
  }, [preview, onCancel]);

  if (!preview) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="expression-preview-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 px-3 py-4 backdrop-blur-sm sm:items-center sm:px-4 sm:py-6"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-2xl rounded-xl border border-border bg-background p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] sm:p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--theme-primary-light)] text-theme-primary">
            <Wand2 size={18} aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h3
              id="expression-preview-title"
              className="font-heading text-base font-semibold"
            >
              Add expression cues?
            </h3>
            <p className="text-sm text-muted-foreground">
              We&apos;ll insert local audio tags ([cheerfully], [short pause], etc.) based on the script context.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Before
            </p>
            <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card px-3 py-2 text-xs leading-5 sm:max-h-60">
              {preview.before}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-theme-primary">
              After
            </p>
            <div className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-theme-primary bg-[var(--theme-primary-light)] px-3 py-2 text-xs leading-5 sm:max-h-60">
              {preview.after}
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => onConfirm(preview.after)}
          >
            Apply changes
          </Button>
        </div>
        <p className="mt-2 text-right text-[11px] text-muted-foreground">
          Press Esc to cancel.
        </p>
      </div>
    </div>
  );
}
