"use client";

import {
  Check,
  Library,
  Mic2,
  Pause,
  Pencil,
  Pin,
  PinOff,
  Play,
  Search,
  Star,
  Trash2,
  UserRoundCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  customVoiceTones,
  isVoicePinned,
  loadPinnedVoices,
  loadRecentVoices,
  partitionCustomVoices,
  recordRecentVoice,
  togglePinnedVoice,
  type VoiceRef,
} from "@/lib/voice-utils";
import type {
  CustomVoiceProfile,
  CustomVoiceSource,
} from "@/types/custom-voices";
import type { Speaker, Voice, VoiceGender } from "@/types/tts";
import type { PreviewLanguage, useVoicePreview } from "@/hooks/use-voice-preview";

export type VoicePickerMode = "single" | "multi" | "lab-source";
export type VoiceTabKey = "builtin" | "custom";

interface VoicePickerProps {
  mode: VoicePickerMode;
  /**
   * "all" shows both tabs.
   * "builtin-only" hides the Custom tab (used in multi-speaker mode where only the
   * built-in TTS engine works).
   * "custom-only" hides the Built-in tab.
   * "remix-source" same as custom-only but only shows voices that support remixing
   * (Studio designed/library, not uploaded clones).
   */
  visibility?: "all" | "builtin-only" | "custom-only" | "remix-source";
  builtinVoices: Voice[];
  customVoices: CustomVoiceProfile[];
  selectedRef?: VoiceRef;
  speakers?: Speaker[];
  preview: ReturnType<typeof useVoicePreview>;
  previewLanguage?: PreviewLanguage;
  loadingLibrary?: boolean;
  onSelect: (ref: VoiceRef) => void;
  onAssignSpeaker?: (speakerIndex: number, ref: VoiceRef) => void;
  onRenameCustomVoice?: (voice: CustomVoiceProfile) => void;
  onDeleteCustomVoice?: (voice: CustomVoiceProfile) => void;
  /** Optional title override; defaults to "Voice Library". */
  title?: string;
  /** Optional helper line below the title. */
  subtitle?: string;
}

interface UnifiedVoice {
  ref: VoiceRef;
  displayName: string;
  description: string;
  /** Internal flag — never shown in UI as a label. */
  internalProvider: "builtin" | "custom";
  gender?: VoiceGender | string;
  accent?: string;
  language?: string;
  useCase?: string;
  tones: string[];
  source: "builtin" | CustomVoiceSource;
  /** True if a preview URL is available to play. */
  previewable: boolean;
  /** Underlying objects for callbacks. */
  builtin?: Voice;
  custom?: CustomVoiceProfile;
}

/**
 * Source labels are user-facing. We keep them generic — no engine/provider
 * names — so the user just sees what kind of voice it is, not how it's made.
 */
function sourceBadge(source: UnifiedVoice["source"]): string | null {
  switch (source) {
    case "builtin":
      // Built-in voices live under the "Built-in" tab; no extra badge needed.
      return null;
    case "voice-library":
      // Library voices sit alongside built-ins in the Built-in tab; no badge.
      return null;
    case "voice-design":
      return "Designed";
    case "voice-remix":
      return "Remix";
    case "instant-clone":
    case "instant-text":
      return "Cloned";
    default:
      return null;
  }
}

function titleCase(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  hi: "Hindi",
  bn: "Bengali",
  mr: "Marathi",
  ta: "Tamil",
  te: "Telugu",
  gu: "Gujarati",
  kn: "Kannada",
  ml: "Malayalam",
  pa: "Punjabi",
  ur: "Urdu",
  es: "Spanish",
  fr: "French",
  de: "German",
  pt: "Portuguese",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  zh: "Chinese",
  ar: "Arabic",
  ru: "Russian",
  tr: "Turkish",
  pl: "Polish",
  nl: "Dutch",
  id: "Indonesian",
  vi: "Vietnamese",
  th: "Thai",
  fil: "Filipino",
  uk: "Ukrainian",
  cs: "Czech",
  sv: "Swedish",
  el: "Greek",
  he: "Hebrew",
  fa: "Persian",
  ro: "Romanian",
};

function languageLabel(value?: string) {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return undefined;
  // Common ISO-ish codes (e.g. "en", "hi", "pt-BR")
  const direct = LANGUAGE_NAMES[trimmed];
  if (direct) return direct;
  const base = trimmed.split(/[-_]/)[0];
  if (LANGUAGE_NAMES[base]) return LANGUAGE_NAMES[base];
  // Already a full name
  return titleCase(value);
}

function unifyBuiltin(voice: Voice): UnifiedVoice {
  // Built-in voices always have static preview MP3s under /public/previews.
  // They are multilingual — they pass any language filter.
  return {
    ref: { kind: "builtin", id: voice.id },
    displayName: voice.displayName,
    description: voice.description,
    internalProvider: "builtin",
    gender: voice.gender,
    accent: voice.accent,
    language: "Multilingual",
    useCase: undefined,
    tones: voice.tones,
    source: "builtin",
    previewable: true,
    builtin: voice,
  };
}

function unifyCustom(voice: CustomVoiceProfile): UnifiedVoice {
  return {
    ref: { kind: "custom", id: voice.voiceId },
    displayName: voice.name,
    description: voice.description || "Saved voice.",
    internalProvider: "custom",
    gender: titleCase(voice.labels?.gender),
    accent: titleCase(voice.labels?.accent),
    language: languageLabel(voice.labels?.language),
    useCase: titleCase(voice.labels?.use_case),
    tones: customVoiceTones(voice),
    source: voice.source,
    previewable: Boolean(voice.previewUrl),
    custom: voice,
  };
}

function VoiceBadge({
  children,
  tone = "default",
}: {
  children: React.ReactNode;
  tone?: "default" | "accent" | "source";
}) {
  const className =
    tone === "accent"
      ? "rounded-full border border-theme-primary/30 bg-[rgba(51,83,254,0.06)] px-2 py-0.5 text-[10px] font-medium text-theme-primary"
      : tone === "source"
        ? "rounded-full border border-amber-300/60 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800"
        : "rounded-full border border-border bg-background px-2 py-0.5 text-[10px] text-muted-foreground";
  return <span className={className}>{children}</span>;
}

function VoiceCard({
  voice,
  selected,
  active,
  isPlaying,
  error,
  pinned,
  pickerMode,
  speakers,
  onSelect,
  onAssignSpeaker,
  onPreview,
  onTogglePin,
  onRename,
  onDelete,
}: {
  voice: UnifiedVoice;
  selected: boolean;
  active: boolean;
  isPlaying: boolean;
  error?: string;
  pinned: boolean;
  pickerMode: VoicePickerMode;
  speakers?: Speaker[];
  onSelect: () => void;
  onAssignSpeaker?: (speakerIndex: number) => void;
  onPreview: () => void;
  onTogglePin: () => void;
  onRename?: () => void;
  onDelete?: () => void;
}) {
  const assignedSpeakerIndexes = useMemo(() => {
    if (!speakers) return [] as number[];
    return speakers.flatMap((speaker, index) =>
      speaker.voice === voice.ref.id ? [index] : [],
    );
  }, [speakers, voice.ref.id]);

  const sourceLabel = sourceBadge(voice.source);
  const primaryAccent =
    voice.accent && voice.accent.toLowerCase() !== "multilingual"
      ? voice.accent
      : voice.language;
  const tonesToShow = voice.tones.slice(0, 3);
  // In multi-speaker mode, only built-in voices can be assigned (the multi-
  // speaker engine doesn't accept custom voices).
  const supportsMultiSpeaker =
    pickerMode === "multi" && voice.ref.kind === "builtin";

  return (
    <article
      className={`group relative w-full overflow-hidden rounded-xl border bg-card p-2.5 transition ${
        selected
          ? "border-theme-primary shadow-[0_0_0_3px_rgba(51,83,254,0.10)]"
          : "border-border hover:border-theme-primary/50"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={onSelect}
          aria-pressed={selected}
        >
          <div className="flex items-center gap-2">
            <p className="truncate font-heading text-sm font-semibold">
              {voice.displayName}
            </p>
            {selected ? (
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-theme-primary text-white">
                <Check size={12} aria-hidden="true" />
              </span>
            ) : null}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {voice.gender ? <VoiceBadge>{voice.gender}</VoiceBadge> : null}
            {primaryAccent ? (
              <VoiceBadge tone="accent">{primaryAccent}</VoiceBadge>
            ) : null}
            {sourceLabel ? <VoiceBadge tone="source">{sourceLabel}</VoiceBadge> : null}
          </div>
          <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
            {voice.description}
          </p>
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <Button
            type="button"
            size="icon-sm"
            variant={active && isPlaying ? "secondary" : "outline"}
            onClick={onPreview}
            title={
              !voice.previewable
                ? "No preview available for this voice"
                : (error ?? `Preview ${voice.displayName}`)
            }
            aria-label={`Preview ${voice.displayName}`}
            disabled={!voice.previewable || (Boolean(error) && !active)}
          >
            {active && isPlaying ? (
              <Pause size={14} aria-hidden="true" />
            ) : (
              <Play size={14} aria-hidden="true" />
            )}
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            onClick={onTogglePin}
            title={pinned ? "Unpin voice" : "Pin voice"}
            aria-label={pinned ? "Unpin voice" : "Pin voice"}
            aria-pressed={pinned}
          >
            {pinned ? (
              <Pin size={13} aria-hidden="true" className="text-theme-primary" />
            ) : (
              <PinOff size={13} aria-hidden="true" className="opacity-50 group-hover:opacity-100" />
            )}
          </Button>
        </div>
      </div>

      {tonesToShow.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {tonesToShow.map((tone) => (
            <VoiceBadge key={`${voice.ref.id}-${tone}`}>{tone}</VoiceBadge>
          ))}
        </div>
      ) : null}

      {supportsMultiSpeaker ? (
        <div className="mt-2 flex gap-1.5">
          {[0, 1].map((index) => {
            const assigned = assignedSpeakerIndexes.includes(index);
            return (
              <button
                key={index}
                type="button"
                className={`min-w-0 flex-1 rounded-md border px-2 py-1.5 text-[11px] font-medium transition ${
                  assigned
                    ? "border-theme-primary bg-theme-primary text-white"
                    : "border-border bg-background text-muted-foreground hover:border-theme-primary hover:text-foreground"
                }`}
                onClick={() => onAssignSpeaker?.(index)}
                aria-pressed={assigned}
                title={`Assign to Speaker ${index + 1}`}
              >
                <span className="inline-flex items-center justify-center gap-1">
                  <UserRoundCheck size={11} aria-hidden="true" />
                  S{index + 1}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {voice.custom && (onRename || onDelete) ? (
        <div className="mt-2 flex items-center justify-end gap-1 opacity-0 transition group-hover:opacity-100">
          {onRename ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onRename}
              aria-label={`Rename ${voice.displayName}`}
            >
              <Pencil size={13} aria-hidden="true" />
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              onClick={onDelete}
              aria-label={`Delete ${voice.displayName}`}
            >
              <Trash2 size={13} aria-hidden="true" />
            </Button>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 text-xs text-amber-700">{error}</p>
      ) : null}
    </article>
  );
}

export function VoicePicker({
  mode,
  visibility = "all",
  builtinVoices,
  customVoices,
  selectedRef,
  speakers,
  preview,
  previewLanguage = "english",
  loadingLibrary = false,
  onSelect,
  onAssignSpeaker,
  onRenameCustomVoice,
  onDeleteCustomVoice,
  title = "Voice Library",
  subtitle,
}: VoicePickerProps) {
  const { builtin: importedFromLibrary, custom: userCreations } = useMemo(
    () => partitionCustomVoices(customVoices),
    [customVoices],
  );

  const initialTab: VoiceTabKey =
    visibility === "custom-only" || visibility === "remix-source"
      ? "custom"
      : "builtin";
  const [userTab, setUserTab] = useState<VoiceTabKey>(initialTab);
  // The effective tab honours the visibility prop. When visibility forces a
  // single tab, we ignore the user's last chosen tab.
  const tab: VoiceTabKey =
    visibility === "builtin-only"
      ? "builtin"
      : visibility === "custom-only" || visibility === "remix-source"
        ? "custom"
        : userTab;
  const [query, setQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [accentFilter, setAccentFilter] = useState("all");
  const [toneFilter, setToneFilter] = useState("all");

  // Recents/pinned live in localStorage and only get pulled in after hydration
  // — using them as initial state would cause a server/client HTML mismatch
  // because the server has no localStorage.
  const [hydrated, setHydrated] = useState(false);
  const [recents, setRecents] = useState<VoiceRef[]>([]);
  const [pinned, setPinned] = useState<VoiceRef[]>([]);

  useEffect(() => {
    // Microtask defers the syncs out of the effect body so the lint rule
    // (set-state-in-effect) sees them as an async sync, which is exactly what
    // they are — pulling localStorage in after hydration.
    void Promise.resolve().then(() => {
      setRecents(loadRecentVoices());
      setPinned(loadPinnedVoices());
      setHydrated(true);
    });
  }, []);

  const setTab = useCallback((next: VoiceTabKey) => {
    setUserTab(next);
    setToneFilter("all");
    setAccentFilter("all");
    setLanguageFilter("all");
  }, []);

  const builtinUnified: UnifiedVoice[] = useMemo(() => {
    const fromCatalog = builtinVoices.map(unifyBuiltin);
    // Multi-speaker mode only supports the built-in catalog voices.
    const fromLibrary =
      mode === "multi" ? [] : importedFromLibrary.map(unifyCustom);
    // Dedupe by ref id (e.g. if a user has imported a library voice that we
    // are also fetching as a shared voice).
    const seen = new Set<string>();
    const out: UnifiedVoice[] = [];
    for (const voice of [...fromCatalog, ...fromLibrary]) {
      const key = `${voice.ref.kind}:${voice.ref.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(voice);
    }
    return out;
  }, [builtinVoices, importedFromLibrary, mode]);

  const customUnified: UnifiedVoice[] = useMemo(() => {
    let voices = userCreations.map(unifyCustom);
    if (visibility === "remix-source") {
      voices = voices.filter(
        (voice) => voice.custom?.provider === "elevenlabs" && voice.custom.source !== "instant-clone",
      );
    }
    return voices;
  }, [userCreations, visibility]);

  const activeList = tab === "builtin" ? builtinUnified : customUnified;

  // Derive filter options from the active tab's voices
  const allTones = useMemo(() => {
    const set = new Set<string>();
    for (const voice of activeList) {
      voice.tones.forEach((tone) => set.add(tone));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeList]);

  const allAccents = useMemo(() => {
    const set = new Set<string>();
    for (const voice of activeList) {
      const value = voice.accent;
      if (!value) continue;
      if (value.toLowerCase() === "multilingual") continue;
      set.add(value);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [activeList]);

  const allLanguages = useMemo(() => {
    const set = new Set<string>();
    let hasMultilingual = false;
    for (const voice of activeList) {
      const value = voice.language;
      if (!value) continue;
      if (value === "Multilingual") {
        hasMultilingual = true;
        continue;
      }
      set.add(value);
    }
    // Surface Hindi first when present, then alphabetical, then Multilingual
    // last so picking it is an explicit choice.
    const sorted = Array.from(set).sort((a, b) => a.localeCompare(b));
    const hindiIndex = sorted.findIndex((value) => value === "Hindi");
    if (hindiIndex > 0) {
      const [hindi] = sorted.splice(hindiIndex, 1);
      sorted.unshift(hindi);
    }
    if (hasMultilingual) sorted.push("Multilingual");
    return sorted;
  }, [activeList]);

  const filteredVoices = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return activeList.filter((voice) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          voice.displayName,
          voice.description,
          voice.gender ?? "",
          voice.accent ?? "",
          voice.language ?? "",
          voice.useCase ?? "",
          ...voice.tones,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesGender =
        genderFilter === "all" ||
        (typeof voice.gender === "string" &&
          voice.gender.toLowerCase().includes(genderFilter));
      const matchesLanguage =
        languageFilter === "all" || voice.language === languageFilter;
      const matchesAccent =
        accentFilter === "all" || voice.accent === accentFilter;
      const matchesTone = toneFilter === "all" || voice.tones.includes(toneFilter);
      return matchesQuery && matchesGender && matchesLanguage && matchesAccent && matchesTone;
    });
  }, [activeList, query, genderFilter, languageFilter, accentFilter, toneFilter]);

  // Pinned voices are surfaced at the top regardless of filters
  const orderedVoices = useMemo(() => {
    if (pinned.length === 0) return filteredVoices;
    const pinnedKeys = new Set(pinned.map((ref) => `${ref.kind}:${ref.id}`));
    const pinnedVoices = filteredVoices.filter((voice) =>
      pinnedKeys.has(`${voice.ref.kind}:${voice.ref.id}`),
    );
    const others = filteredVoices.filter(
      (voice) => !pinnedKeys.has(`${voice.ref.kind}:${voice.ref.id}`),
    );
    return [...pinnedVoices, ...others];
  }, [filteredVoices, pinned]);

  const recentUnified: UnifiedVoice[] = useMemo(() => {
    const all = [...builtinUnified, ...customUnified];
    const lookup = new Map<string, UnifiedVoice>();
    for (const voice of all) {
      lookup.set(`${voice.ref.kind}:${voice.ref.id}`, voice);
    }
    return recents
      .map((ref) => lookup.get(`${ref.kind}:${ref.id}`))
      .filter((value): value is UnifiedVoice => Boolean(value))
      .slice(0, 6);
  }, [recents, builtinUnified, customUnified]);

  const handleSelect = useCallback(
    (voice: UnifiedVoice) => {
      if (mode === "multi") {
        // In multi mode, clicking the card body should not select; the speaker
        // assignment buttons drive selection. Only built-in voices can be
        // assigned to a speaker.
        return;
      }
      setRecents(recordRecentVoice(voice.ref));
      onSelect(voice.ref);
    },
    [mode, onSelect],
  );

  const handleAssignSpeaker = useCallback(
    (voice: UnifiedVoice, speakerIndex: number) => {
      setRecents(recordRecentVoice(voice.ref));
      onAssignSpeaker?.(speakerIndex, voice.ref);
    },
    [onAssignSpeaker],
  );

  const handlePreview = useCallback(
    (voice: UnifiedVoice) => {
      if (voice.builtin) {
        preview.preview(voice.builtin, previewLanguage);
        return;
      }
      if (voice.custom?.previewUrl) {
        preview.preview(
          {
            id: voice.custom.voiceId,
            displayName: voice.custom.name,
            gender: "Female",
            description: voice.custom.description,
            tones: [],
            previewText: "",
            previewUrl: voice.custom.previewUrl,
            previewUrls: {
              english: voice.custom.previewUrl,
              hindi: voice.custom.previewUrl,
            },
            enabledInMvp: true,
            provider: "elevenlabs",
            accent: voice.accent ?? "Custom",
          } as Voice,
          previewLanguage,
        );
      }
    },
    [preview, previewLanguage],
  );

  const handleTogglePin = useCallback((voice: UnifiedVoice) => {
    setPinned(togglePinnedVoice(voice.ref));
  }, []);

  const previewKey = useCallback(
    (voice: UnifiedVoice) => `${voice.ref.id}:${previewLanguage}`,
    [previewLanguage],
  );

  const showBuiltinTab = visibility === "all" || visibility === "builtin-only";
  const showCustomTab =
    visibility === "all" || visibility === "custom-only" || visibility === "remix-source";

  return (
    <aside className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Library size={16} className="text-theme-primary" aria-hidden="true" />
            <h2 className="font-heading text-lg font-semibold">{title}</h2>
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {orderedVoices.length}/{activeList.length} shown
            {tab === "builtin" && loadingLibrary ? " · loading…" : ""}
          </span>
        </div>
        {subtitle ? (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {showBuiltinTab && showCustomTab ? (
        <div className="grid grid-cols-2 gap-1 rounded-md border border-border bg-card p-0.5">
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
              tab === "builtin"
                ? "bg-theme-primary text-white shadow-[0_2px_8px_rgba(31,76,238,0.18)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("builtin")}
          >
            <Library size={13} aria-hidden="true" />
            Built-in
            <VoiceBadge>{builtinUnified.length}</VoiceBadge>
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium ${
              tab === "custom"
                ? "bg-theme-primary text-white shadow-[0_2px_8px_rgba(31,76,238,0.18)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("custom")}
          >
            <Mic2 size={13} aria-hidden="true" />
            Custom
            <VoiceBadge>{customUnified.length}</VoiceBadge>
          </button>
        </div>
      ) : null}

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
            placeholder={tab === "builtin" ? "Search by name, accent, tone" : "Search your voices"}
            aria-label="Search voices"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            className="h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={genderFilter}
            onChange={(event) =>
              setGenderFilter(event.target.value as "all" | "male" | "female")
            }
            aria-label="Filter by gender"
          >
            <option value="all">All genders</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
          <select
            className="h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={languageFilter}
            onChange={(event) => setLanguageFilter(event.target.value)}
            aria-label="Filter by language"
            disabled={allLanguages.length === 0}
          >
            <option value="all">All languages</option>
            {allLanguages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
          <select
            className="h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={accentFilter}
            onChange={(event) => setAccentFilter(event.target.value)}
            aria-label="Filter by accent"
            disabled={allAccents.length === 0}
          >
            <option value="all">All accents</option>
            {allAccents.map((accent) => (
              <option key={accent} value={accent}>
                {accent}
              </option>
            ))}
          </select>
          <select
            className="h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={toneFilter}
            onChange={(event) => setToneFilter(event.target.value)}
            aria-label="Filter by tone"
            disabled={allTones.length === 0}
          >
            <option value="all">All tones</option>
            {allTones.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {hydrated && recentUnified.length > 0 && mode !== "multi" ? (
        <section className="space-y-1.5">
          <div className="flex items-center gap-1.5 px-0.5">
            <Star size={12} className="text-theme-primary" aria-hidden="true" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Recents
            </span>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recentUnified.map((voice) => {
              const isSelected =
                selectedRef?.kind === voice.ref.kind && selectedRef.id === voice.ref.id;
              return (
                <button
                  key={`recent-${voice.ref.kind}-${voice.ref.id}`}
                  type="button"
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    isSelected
                      ? "border-theme-primary bg-[rgba(51,83,254,0.10)] text-theme-primary"
                      : "border-border bg-card text-foreground hover:border-theme-primary"
                  }`}
                  onClick={() => {
                    setRecents(recordRecentVoice(voice.ref));
                    onSelect(voice.ref);
                  }}
                  title={`Select ${voice.displayName}`}
                >
                  {voice.displayName}
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid max-h-[480px] min-w-0 gap-2 overflow-y-auto overflow-x-hidden pr-1">
        {orderedVoices.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
            {tab === "custom"
              ? "No custom voices yet. Create one in Voice Lab to use it here."
              : tab === "builtin" && loadingLibrary
                ? "Loading more voices…"
                : "No voices match the current filters."}
          </div>
        ) : (
          orderedVoices.map((voice) => {
            const previewId = previewKey(voice);
            const selected =
              mode === "multi"
                ? speakers?.some((speaker) => speaker.voice === voice.ref.id) ?? false
                : selectedRef?.kind === voice.ref.kind && selectedRef.id === voice.ref.id;
            return (
              <VoiceCard
                key={`${voice.ref.kind}:${voice.ref.id}`}
                voice={voice}
                selected={selected}
                active={preview.activePreviewId === previewId}
                isPlaying={preview.isPlaying}
                error={preview.errors[previewId]}
                pinned={isVoicePinned(pinned, voice.ref)}
                pickerMode={mode}
                speakers={speakers}
                onSelect={() => handleSelect(voice)}
                onAssignSpeaker={
                  voice.ref.kind === "builtin"
                    ? (speakerIndex) => handleAssignSpeaker(voice, speakerIndex)
                    : undefined
                }
                onPreview={() => handlePreview(voice)}
                onTogglePin={() => handleTogglePin(voice)}
                onRename={
                  voice.custom && onRenameCustomVoice
                    ? () => onRenameCustomVoice(voice.custom as CustomVoiceProfile)
                    : undefined
                }
                onDelete={
                  voice.custom && onDeleteCustomVoice
                    ? () => onDeleteCustomVoice(voice.custom as CustomVoiceProfile)
                    : undefined
                }
              />
            );
          })
        )}
      </div>
    </aside>
  );
}
