"use client";

import {
  AlertCircle,
  Check,
  Clock3,
  Download,
  Mic2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRoundCheck,
  Volume2,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { EXPRESSIVE_TAGS } from "@/config/expressive-tags";
import { CustomVoiceLab } from "@/components/studio/custom-voice-lab";
import { LONG_SCRIPT_WARNING_CHARACTERS } from "@/config/limits";
import { MVP_LANGUAGES, toProviderLanguageCode } from "@/config/languages";
import {
  ACCENT_PRESETS,
  PACE_PRESETS,
  TONE_PRESETS,
  getPresetInstruction,
} from "@/config/style-presets";
import { MVP_VOICES } from "@/config/voices";
import { Button } from "@/components/ui/button";
import { useAudioManager } from "@/hooks/use-audio-manager";
import { useTTSGeneration } from "@/hooks/use-tts-generation";
import { useVoicePreview, type PreviewLanguage } from "@/hooks/use-voice-preview";
import { estimatePromptCredits, formatCredits } from "@/lib/cost";
import { clientStore, makeLocalId } from "@/lib/client-store";
import type {
  LanguageOption,
  LocalGeneration,
  LocalScript,
  Speaker,
  StudioState,
  TTSOutputFormat,
  Voice,
  VoiceGender,
} from "@/types/tts";

const defaultStudioState: StudioState = {
  mode: "single",
  prompt: "",
  styleInstructions: "",
  voiceId: "Kore",
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

const PREVIEW_LANGUAGE_OPTIONS = [
  { value: "english", label: "English previews" },
  { value: "hindi", label: "Hindi previews" },
] as const;

function clampAccentStrength(value: number) {
  if (!Number.isFinite(value)) {
    return defaultStudioState.accentStrength;
  }

  return Math.min(100, Math.max(0, value));
}

function accentStrengthLabel(value: number) {
  const strength = clampAccentStrength(value);
  if (strength <= 5) {
    return "Neutral";
  }
  if (strength <= 30) {
    return "Light";
  }
  if (strength <= 60) {
    return "Balanced";
  }
  if (strength <= 85) {
    return "Strong";
  }
  return "Very strong";
}

function getAccentStrengthInstruction(state: StudioState) {
  const strength = clampAccentStrength(state.accentStrength);

  if (state.accentPreset === "neutral" || strength <= 5) {
    return "Keep regional accent influence very light and prioritize neutral, broadly understandable pronunciation.";
  }

  if (strength <= 30) {
    return "Apply the selected accent subtly; avoid heavy regional pronunciation.";
  }

  if (strength <= 60) {
    return "Apply the selected accent at a natural medium strength while keeping every word clear.";
  }

  if (strength <= 85) {
    return "Use a clear, noticeable selected accent while preserving intelligibility.";
  }

  return "Use a strong selected accent, but keep speech clean, polished, and easy to understand.";
}

function composeStyleInstructions(state: StudioState) {
  const presetInstructions = [
    getPresetInstruction(ACCENT_PRESETS, state.accentPreset),
    getAccentStrengthInstruction(state),
    getPresetInstruction(TONE_PRESETS, state.tonePreset),
    getPresetInstruction(PACE_PRESETS, state.pacePreset),
  ];

  return [...presetInstructions, state.styleInstructions.trim()]
    .filter(Boolean)
    .join(" ");
}

function languageOptionLabel(language: LanguageOption) {
  if (language.id === "auto") {
    return language.label;
  }

  return language.region === "India"
    ? `India - ${language.label}`
    : `${language.region ?? "Global"} - ${language.label}`;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0:00";
  }

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function getVoiceName(voiceId: string) {
  return MVP_VOICES.find((voice) => voice.id === voiceId)?.displayName ?? voiceId;
}

function speakerButtonLabel(speaker: Speaker, index: number) {
  const alias = speaker.speaker_id || `Speaker${index + 1}`;
  return `${alias} - ${getVoiceName(speaker.voice)}`;
}

function hasLeadingAudioTag(text: string) {
  return /^\s*(?:[A-Za-z0-9]+:\s*)?\[[^\]]+\]/.test(text);
}

function addTagAfterSpeakerPrefix(line: string, tag: string) {
  const match = line.match(/^(\s*[A-Za-z0-9]+:\s*)(.*)$/);
  if (match) {
    return `${match[1]}${tag} ${match[2].trimStart()}`;
  }

  return `${tag} ${line.trimStart()}`;
}

function autoMarkupLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) {
    return line;
  }

  let next = line.replace(/\s*\.\.\.\s*/g, " [long pause] ");
  if (hasLeadingAudioTag(next)) {
    return next;
  }

  const lower = trimmed.toLowerCase();
  const isLoud = /(!{2,}|urgent|now|stop|look out|watch out)/i.test(trimmed);
  const isLaughing = /(haha|lol|funny|joke|laugh|hilarious|smiled?)/i.test(trimmed);
  const isSigh = /(sorry|unfortunately|tired|exhausted|sad|miss you|bad news)/i.test(trimmed);
  const isWhisper = /(secret|quietly|keep this between us|listen closely)/i.test(trimmed);
  const isSarcastic = /(yeah right|as if|obviously|sure, because)/i.test(lower);
  const isHesitation = /^(?:[A-Za-z0-9]+:\s*)?(well|um|uh|hmm|actually)\b/i.test(trimmed);
  const isCheerful = /(great news|welcome|congrats|congratulations|happy|delighted)/i.test(trimmed);
  const isDramatic = /(final chance|never forget|betray|betrayed|destiny|at last)/i.test(trimmed);
  const isFast = /(quickly|hurry|as fast as|right away|immediately)/i.test(trimmed);

  if (isSarcastic) {
    next = addTagAfterSpeakerPrefix(next, "[sarcasm]");
  } else if (isWhisper) {
    next = addTagAfterSpeakerPrefix(next, "[whispering]");
  } else if (isLoud) {
    next = addTagAfterSpeakerPrefix(next, "[shouting]");
  } else if (isLaughing) {
    next = addTagAfterSpeakerPrefix(next, "[laughing]");
  } else if (isSigh) {
    next = addTagAfterSpeakerPrefix(next, "[sigh]");
  } else if (isHesitation) {
    next = addTagAfterSpeakerPrefix(next, "[uhm]");
  } else if (isCheerful) {
    next = addTagAfterSpeakerPrefix(next, "[cheerfully]");
  } else if (isDramatic) {
    next = addTagAfterSpeakerPrefix(next, "[dramatic]");
  } else if (isFast) {
    next = addTagAfterSpeakerPrefix(next, "[fast]");
  }

  return next.replace(/\s{2,}/g, " ").trimEnd();
}

function addFallbackExpression(prompt: string) {
  const withSentencePauses = prompt.replace(
    /([.!?])\s+(?=(?:[A-Za-z0-9]+:\s*)?["'A-Za-z0-9])/g,
    "$1 [short pause] ",
  );

  if (withSentencePauses !== prompt) {
    return withSentencePauses;
  }

  const lines = prompt.split("\n");
  const firstMarkableLine = lines.findIndex(
    (line) => line.trim() && !hasLeadingAudioTag(line),
  );

  if (firstMarkableLine === -1) {
    return prompt;
  }

  lines[firstMarkableLine] = addTagAfterSpeakerPrefix(
    lines[firstMarkableLine],
    "[cheerfully]",
  );
  return lines.join("\n");
}

function autoMarkupPrompt(prompt: string) {
  const markedPrompt = prompt
    .split("\n")
    .map((line) => autoMarkupLine(line))
    .join("\n");

  if (markedPrompt !== prompt) {
    return markedPrompt;
  }

  return addFallbackExpression(prompt);
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
          <div className="flex size-8 items-center justify-center rounded-lg bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.25)]">
            <Mic2 size={17} aria-hidden="true" />
          </div>
          <div>
            <p className="font-heading text-base font-semibold">Audio Studio</p>
            <p className="hidden text-xs text-muted-foreground sm:block">
              Local ThreeZinc speech workspace
            </p>
          </div>
        </div>

        <div className="order-3 flex w-full rounded-md border border-border bg-card p-0.5 sm:order-none sm:w-auto">
          <button
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium sm:flex-none ${
              workspace === "tts"
                ? "bg-theme-primary text-white"
                : "text-muted-foreground"
            }`}
            type="button"
            onClick={() => onWorkspaceChange("tts")}
          >
            TTS Studio
          </button>
          <button
            className={`flex-1 rounded px-3 py-1.5 text-xs font-medium sm:flex-none ${
              workspace === "voice-cloning"
                ? "bg-theme-primary text-white"
                : "text-muted-foreground"
            }`}
            type="button"
            onClick={() => onWorkspaceChange("voice-cloning")}
          >
            Voice Cloning
          </button>
        </div>

        {workspace === "tts" ? (
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border bg-card p-0.5">
              <button
                className={`rounded px-3 py-1 text-xs font-medium ${
                  mode === "single"
                    ? "bg-theme-primary text-white"
                    : "text-muted-foreground"
                }`}
                type="button"
                onClick={() => onModeChange("single")}
              >
                Single Voice
              </button>
              <button
                className={`rounded px-3 py-1 text-xs font-medium ${
                  mode === "multi"
                    ? "bg-theme-primary text-white"
                    : "text-muted-foreground"
                }`}
                type="button"
                onClick={() => onModeChange("multi")}
              >
                Multi-Speaker
              </button>
            </div>
            <div className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
              {characterCount.toLocaleString()} chars
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            Custom voice workspace
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
  );
}

function ScriptEditor({
  prompt,
  mode,
  speakers,
  onPromptChange,
}: {
  prompt: string;
  mode: StudioState["mode"];
  speakers: Speaker[];
  onPromptChange: (value: string) => void;
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
    onPromptChange(nextPrompt);
    setAutoExpressionStatus(
      nextPrompt === prompt
        ? "Script already has expression cues."
        : "Expression cues added.",
    );
  }, [onPromptChange, prompt]);

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
              className="inline-flex items-center gap-1 rounded border border-theme-primary bg-[rgba(51,83,254,0.08)] px-2 py-1 text-xs font-medium text-theme-primary transition hover:bg-[rgba(51,83,254,0.14)]"
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
        placeholder="Write the spoken script here. Add expressive tags like [excited] or [short pause] where they should influence delivery."
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
          {autoExpressionStatus || "Adds reliable local audio tags from the script context."}
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
}: {
  state: StudioState;
  speakerIssues: string[];
  onChange: (state: StudioState) => void;
}) {
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
        <div className="rounded-lg border border-theme-primary bg-[rgba(51,83,254,0.08)] px-3 py-2 text-sm font-medium text-theme-primary">
          Multi-speaker mode uses exactly two speakers.
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
      />

      <section className="space-y-3 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={15} className="text-theme-primary" aria-hidden="true" />
          <FieldLabel>Voice Controls</FieldLabel>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <FieldLabel>Accent</FieldLabel>
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
            <FieldLabel>Tone</FieldLabel>
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
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Accent Strength</FieldLabel>
              <span className="text-xs font-medium text-muted-foreground">
                {accentStrengthLabel(state.accentStrength)} - {state.accentStrength}%
              </span>
            </div>
            <input
              className="w-full accent-[#3353FE]"
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
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>Creativity</FieldLabel>
              <span className="text-xs font-medium text-muted-foreground">
                {state.temperature.toFixed(1)}
              </span>
            </div>
            <input
              className="w-full accent-[#3353FE]"
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
          </div>
        </div>
      </section>

      <section className="space-y-1.5">
        <FieldLabel>Custom Direction</FieldLabel>
        <input
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
          value={state.styleInstructions}
          onChange={(event) =>
            onChange({ ...state, styleInstructions: event.target.value })
          }
          placeholder="Example: Speak clearly, confident, slightly upbeat."
        />
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

function VoiceCard({
  voice,
  selected,
  assignedSpeakerIndexes,
  active,
  isPlaying,
  error,
  previewDisabledReason,
  mode,
  onSelect,
  onAssignSpeaker,
  onPreview,
}: {
  voice: Voice;
  selected: boolean;
  assignedSpeakerIndexes: number[];
  active: boolean;
  isPlaying: boolean;
  error?: string;
  previewDisabledReason?: string;
  mode: StudioState["mode"];
  onSelect: () => void;
  onAssignSpeaker: (index: number) => void;
  onPreview: () => void;
}) {
  const previewError = previewDisabledReason ?? error;

  return (
    <article
      className={`rounded-lg border bg-card p-3 transition ${
        selected
          ? "border-theme-primary shadow-[0_0_0_3px_rgba(51,83,254,0.08)]"
          : "border-border"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          className="min-w-0 text-left"
          onClick={onSelect}
          aria-pressed={selected}
        >
          <div className="flex items-center gap-2">
            <p className="font-heading text-base font-semibold">
              {voice.displayName}
            </p>
            {selected ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-theme-primary text-white">
                <Check size={12} aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {voice.description}
          </p>
        </button>
        <Button
          type="button"
          size="icon-sm"
          variant={active && isPlaying ? "secondary" : "outline"}
          onClick={onPreview}
          title={previewError ?? `Preview ${voice.displayName}`}
          aria-label={`Preview ${voice.displayName}`}
          disabled={Boolean(previewError)}
        >
          {active && isPlaying ? (
            <Pause size={14} aria-hidden="true" />
          ) : (
            <Play size={14} aria-hidden="true" />
          )}
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1">
        <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">
          {voice.gender}
        </span>
        {voice.tones.map((tone) => (
          <span
            key={tone}
            className="rounded border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground"
          >
            {tone}
          </span>
        ))}
      </div>
      {mode === "multi" ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {[0, 1].map((index) => {
            const assigned = assignedSpeakerIndexes.includes(index);
            return (
              <Button
                key={index}
                type="button"
                size="sm"
                variant={assigned ? "default" : "outline"}
                className={assigned ? "bg-theme-primary text-white" : ""}
                onClick={() => onAssignSpeaker(index)}
              >
                Speaker {index + 1}
              </Button>
            );
          })}
        </div>
      ) : null}
      {previewError ? (
        <p className="mt-2 text-xs text-muted-foreground">{previewError}</p>
      ) : null}
    </article>
  );
}

function VoiceCatalog({
  mode,
  selectedVoiceId,
  speakers,
  preview,
  onSelect,
  onAssignSpeaker,
}: {
  mode: StudioState["mode"];
  selectedVoiceId: string;
  speakers: Speaker[];
  preview: ReturnType<typeof useVoicePreview>;
  onSelect: (voiceId: string) => void;
  onAssignSpeaker: (speakerIndex: number, voiceId: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | VoiceGender>("all");
  const [toneFilter, setToneFilter] = useState("all");
  const [previewLanguage, setPreviewLanguage] =
    useState<PreviewLanguage>("english");

  const tones = useMemo(
    () =>
      Array.from(new Set(MVP_VOICES.flatMap((voice) => voice.tones))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [],
  );

  const filteredVoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return MVP_VOICES.filter((voice) => {
      const matchesQuery =
        !normalizedQuery ||
        [voice.displayName, voice.description, voice.gender, ...voice.tones]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesGender =
        genderFilter === "all" || voice.gender === genderFilter;
      const matchesTone =
        toneFilter === "all" || voice.tones.includes(toneFilter);

      return matchesQuery && matchesGender && matchesTone;
    });
  }, [genderFilter, query, toneFilter]);

  return (
    <aside className="space-y-3">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-heading text-lg font-semibold">Voice Catalog</h2>
          <span className="text-xs font-medium text-muted-foreground">
            {filteredVoices.length}/{MVP_VOICES.length}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          All Fal/Gemini voices include local English and Hindi MP3 previews.
        </p>
      </div>
      <div className="space-y-2">
        <div className="relative">
          <Search
            size={14}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-sm outline-none transition placeholder:text-muted-foreground/70 focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search voice, tone, gender"
            aria-label="Search voice catalog"
          />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={genderFilter}
            onChange={(event) =>
              setGenderFilter(event.target.value as "all" | VoiceGender)
            }
            aria-label="Filter by gender"
          >
            <option value="all">All genders</option>
            <option value="Female">Female</option>
            <option value="Male">Male</option>
          </select>
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={toneFilter}
            onChange={(event) => setToneFilter(event.target.value)}
            aria-label="Filter by tone"
          >
            <option value="all">All tones</option>
            {tones.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-border bg-card px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20 sm:col-span-2"
            value={previewLanguage}
            onChange={(event) =>
              setPreviewLanguage(event.target.value as PreviewLanguage)
            }
            aria-label="Preview language"
          >
            {PREVIEW_LANGUAGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 lg:max-h-[360px]">
        {filteredVoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No voices match the current filters.
          </div>
        ) : (
          filteredVoices.map((voice) => {
            const previewId = `${voice.id}:${previewLanguage}`;

            return (
              <VoiceCard
                key={voice.id}
                voice={voice}
                selected={
                  mode === "single"
                    ? selectedVoiceId === voice.id
                    : speakers.some((speaker) => speaker.voice === voice.id)
                }
                assignedSpeakerIndexes={speakers.flatMap((speaker, index) =>
                  speaker.voice === voice.id ? [index] : [],
                )}
                active={preview.activePreviewId === previewId}
                isPlaying={preview.isPlaying}
                error={preview.errors[previewId]}
                mode={mode}
                onSelect={() => {
                  if (mode === "single") {
                    onSelect(voice.id);
                  }
                }}
                onAssignSpeaker={(speakerIndex) =>
                  onAssignSpeaker(speakerIndex, voice.id)
                }
                onPreview={() => preview.preview(voice, previewLanguage)}
              />
            );
          })
        )}
      </div>
    </aside>
  );
}

function LocalHistoryPanel({
  generations,
  scripts,
  onLoadScript,
  onLoadGeneration,
}: {
  generations: LocalGeneration[];
  scripts: LocalScript[];
  onLoadScript: (script: LocalScript) => void;
  onLoadGeneration: (generation: LocalGeneration) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Local History</h2>
        <p className="text-xs text-muted-foreground">
          Saved on this browser as remote audio URLs and metadata only.
        </p>
      </div>

      <div className="space-y-2">
        {generations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
            No generations yet.
          </div>
        ) : (
          generations.slice(0, 5).map((generation) => (
            <button
              key={generation.id}
              type="button"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-left transition hover:border-theme-primary"
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
          ))
        )}
      </div>

      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Saved scripts
        </p>
        {scripts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            No saved scripts.
          </div>
        ) : (
          scripts.slice(0, 5).map((script) => (
            <button
              key={script.id}
              type="button"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-theme-primary"
              onClick={() => onLoadScript(script)}
            >
              {script.title}
            </button>
          ))
        )}
      </div>
    </section>
  );
}

function GenerationPanel({
  state,
  selectedVoice,
  speakerIssues,
  generationError,
  isGenerating,
  onGenerate,
  onSaveScript,
}: {
  state: StudioState;
  selectedVoice: Voice;
  speakerIssues: string[];
  generationError?: { code: string; message: string; retryable: boolean };
  isGenerating: boolean;
  onGenerate: () => void;
  onSaveScript: () => void;
}) {
  const canGenerate =
    state.prompt.trim().length > 0 && !isGenerating && speakerIssues.length === 0;
  const characterCount = state.prompt.trim().length;
  const languageLabel =
    MVP_LANGUAGES.find((language) => language.id === state.languageCode)?.label ??
    "Auto-detect";

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
      : selectedVoice.displayName;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Generate</h2>
        <p className="text-xs text-muted-foreground">
          Review the selected voice model, script size, and ThreeZinc credits.
        </p>
      </div>

      <div className="grid gap-2 rounded-lg border border-border bg-card p-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Voice model</span>
          <span className="text-right font-medium">{speakerSummary}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Language</span>
          <span className="text-right font-medium">{languageLabel}</span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Output</span>
          <span className="text-right font-medium">
            {state.outputFormat.toUpperCase()} at creativity {state.temperature.toFixed(1)}
          </span>
        </div>
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted-foreground">Credits</span>
          <span className="text-right font-medium">
            {characterCount.toLocaleString()} chars -{" "}
            {formatCredits(estimatePromptCredits(state.prompt))}
          </span>
        </div>
      </div>

      {generationError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle size={16} className="mt-0.5" aria-hidden="true" />
            <div>
              <p className="font-semibold">{generationError.code}</p>
              <p>{generationError.message}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="grid gap-2">
        <Button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className="w-full bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.22)] hover:brightness-105"
        >
          {isGenerating ? "Generating..." : "Generate Audio"}
        </Button>
        <Button type="button" variant="outline" onClick={onSaveScript}>
          <Save size={14} aria-hidden="true" />
          Save script
        </Button>
        {!state.prompt.trim() ? (
          <span className="text-xs text-muted-foreground">
            Add a script to enable generation.
          </span>
        ) : null}
        {speakerIssues.length > 0 ? (
          <span className="text-xs text-red-700">{speakerIssues[0]}</span>
        ) : null}
      </div>
    </section>
  );
}

function AudioPlayer({
  generation,
  audio,
  onRegenerate,
  onClose,
}: {
  generation: LocalGeneration;
  audio: ReturnType<typeof useAudioManager>;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  const source = {
    id: `result:${generation.id}`,
    kind: "result" as const,
    url: generation.audioUrl,
    label: generation.fileName ?? "Generated audio",
  };
  const isActive = audio.state.activeId === source.id;
  const isPlaying = isActive && audio.state.isPlaying;
  const duration = audio.state.duration || 0;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Button
            type="button"
            size="icon"
            className="bg-theme-primary text-white hover:bg-theme-primary-hover"
            onClick={() => audio.toggle(source)}
            aria-label={isPlaying ? "Pause generated audio" : "Play generated audio"}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">
              {generation.fileName ?? "Generated speech"}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-10 text-xs text-muted-foreground">
                {formatTime(isActive ? audio.state.currentTime : 0)}
              </span>
              <input
                className="w-full accent-[#3353FE]"
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={isActive ? audio.state.currentTime : 0}
                onChange={(event) => audio.seek(Number(event.target.value))}
              />
              <span className="w-10 text-xs text-muted-foreground">
                {formatTime(duration)}
              </span>
            </div>
            {isActive && audio.state.error ? (
              <p className="text-xs text-red-700">{audio.state.error}</p>
            ) : null}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Volume2 size={15} className="text-muted-foreground" aria-hidden="true" />
          <input
            className="w-20 accent-[#3353FE]"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={audio.state.volume}
            onChange={(event) => audio.setVolume(Number(event.target.value))}
            aria-label="Audio volume"
          />
          <a
            className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
            href={generation.audioUrl}
            download={generation.fileName ?? "threezinc-studio-audio.mp3"}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={14} aria-hidden="true" />
            Download
          </a>
          <Button type="button" variant="outline" size="sm" onClick={onRegenerate}>
            <RotateCcw size={14} aria-hidden="true" />
            Regenerate
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close audio player"
          >
            <X size={14} aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function TTSStudio() {
  const [hydrated, setHydrated] = useState(false);
  const [workspace, setWorkspace] = useState<StudioWorkspace>("tts");
  const [state, setState] = useState<StudioState>(defaultStudioState);
  const [scripts, setScripts] = useState<LocalScript[]>([]);
  const [generations, setGenerations] = useState<LocalGeneration[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<LocalGeneration | undefined>();

  const audio = useAudioManager();
  const preview = useVoicePreview(audio);
  const generation = useTTSGeneration();

  const selectedVoice = useMemo(
    () => MVP_VOICES.find((voice) => voice.id === state.voiceId) ?? MVP_VOICES[0],
    [state.voiceId],
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

  const promptHasSpeakerPrefixes = useCallback(
    (prompt: string, speakers: StudioState["speakers"]) =>
      speakers.some((speaker) =>
        new RegExp(`(^|\\n)${speaker.speaker_id}:`, "i").test(prompt),
      ),
    [],
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
            prompt: `${current.speakers[0]?.speaker_id ?? "Speaker1"}: ${current.prompt}\n${current.speakers[1]?.speaker_id ?? "Speaker2"}:`,
          };
        }

        return { ...current, mode };
      });
    },
    [promptHasSpeakerPrefixes],
  );

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
    if (hydrated) {
      clientStore.saveSettings(state);
    }
  }, [hydrated, state]);

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
    const firstLine = state.prompt.split("\n").find(Boolean)?.slice(0, 48);
    const script: LocalScript = {
      id: makeLocalId("script"),
      title: firstLine || "Untitled script",
      prompt: state.prompt,
      styleInstructions: state.styleInstructions,
      mode: state.mode,
      voiceId: state.voiceId,
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
    clientStore.upsertScript(script);
    setScripts(clientStore.listScripts());
  }, [state]);

  const runGenerate = useCallback(() => {
    const providerLanguage = toProviderLanguageCode(state.languageCode);
    const styleInstructions = composeStyleInstructions(state);
    const baseRequest = {
      prompt: state.prompt,
      style_instructions: styleInstructions,
      provider: "gemini" as const,
      output_format: state.outputFormat,
      temperature: state.temperature,
      ...(providerLanguage ? { language_code: providerLanguage } : {}),
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
            voice: state.voiceId,
          };

    void generation.generate(request).then((item) => {
      if (item) {
        setActiveGeneration(item);
        setGenerations(clientStore.listGenerations());
      }
    });
  }, [generation, state]);

  const loadScript = useCallback((script: LocalScript) => {
    setState((current) => ({
      ...current,
      prompt: script.prompt,
      styleInstructions: script.styleInstructions,
      mode: script.mode,
      voiceId: script.voiceId ?? current.voiceId,
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
      voiceId: item.voiceId ?? current.voiceId,
      languageCode: item.languageCode ?? current.languageCode,
      outputFormat: item.outputFormat ?? current.outputFormat,
      temperature: item.temperature ?? current.temperature,
    }));
  }, []);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(50,183,238,0.10),transparent_28%),linear-gradient(180deg,rgba(51,83,254,0.04),transparent_280px)] pb-28 text-foreground">
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
            />
          </section>

          <div className="space-y-5">
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              <VoiceCatalog
                mode={state.mode}
                selectedVoiceId={state.voiceId}
                speakers={state.speakers}
                preview={preview}
                onSelect={(voiceId) => setState({ ...state, voiceId })}
                onAssignSpeaker={(speakerIndex, voiceId) =>
                  setState((current) => ({
                    ...current,
                    speakers: current.speakers.map((speaker, index) =>
                      index === speakerIndex
                        ? { ...speaker, voice: voiceId }
                        : speaker,
                    ),
                  }))
                }
              />
            </section>
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              <GenerationPanel
                state={state}
                selectedVoice={selectedVoice}
                speakerIssues={speakerIssues}
                generationError={generation.error}
                isGenerating={generation.isGenerating}
                onGenerate={runGenerate}
                onSaveScript={saveScript}
              />
            </section>
            <section className="rounded-lg border border-border bg-background/88 p-4 shadow-sm">
              <LocalHistoryPanel
                generations={generations}
                scripts={scripts}
                onLoadScript={loadScript}
                onLoadGeneration={loadGeneration}
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
    </main>
  );
}
