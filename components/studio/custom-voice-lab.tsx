"use client";

import {
  AlertCircle,
  BadgeCheck,
  CheckCircle2,
  Download,
  FileAudio2,
  Library,
  Loader2,
  Mic2,
  Pencil,
  RefreshCcw,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  UploadCloud,
  Wand2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  countBillableCharacters,
  estimateCreditsFromCostUsd,
  estimateCustomVoiceTextCostUsd,
  estimateCustomVoiceTransformCostUsd,
  formatCredits,
} from "@/lib/cost";
import {
  DEFAULT_ELEVENLABS_SETTINGS,
  type CustomVoiceProfile,
  type CustomVoiceSource,
  type ElevenLabsVoiceSettings,
  type VoicePreviewCandidate,
} from "@/types/custom-voices";

type LabMode =
  | "instant-text"
  | "speech"
  | "clone"
  | "changer"
  | "design"
  | "remix";
type BusyAction =
  | "refresh"
  | "clone"
  | "instant-text"
  | "speech"
  | "changer"
  | "design"
  | "remix"
  | "save"
  | "delete";

interface AudioResult {
  url: string;
  fileName: string;
  label: string;
}

interface VoiceCapabilities {
  canUseInstantVoiceCloning: boolean;
  canUseProfessionalVoiceCloning: boolean;
  voiceSlotsUsed?: number;
  voiceLimit?: number;
}

const OUTPUT_OPTIONS = [
  { id: "mp3_44100_128", label: "MP3 44.1k" },
  { id: "mp3_22050_32", label: "Small MP3" },
];

const INSTANT_CLONE_MODELS = [
  { id: "speech-02-hd", label: "High quality" },
  { id: "speech-02-turbo", label: "Fast preview" },
  { id: "speech-01-hd", label: "Classic quality" },
  { id: "speech-01-turbo", label: "Classic fast" },
];

const DESIGN_PROMPTS = [
  "Warm Indian English creator voice, friendly, polished, confident",
  "Clear Hindi narrator voice, natural, expressive, premium studio tone",
  "Calm cinematic documentary voice, deep, controlled, high trust",
  "Energetic social media host voice, bright, quick, youthful",
  "Modern woman voice, conversational, warm, premium, natural pacing",
  "Movie trailer voice, deep, cinematic, resonant, controlled intensity",
  "British executive voice, polished, assured, crisp, boardroom confident",
  "Anime character voice, expressive, youthful, bright, high energy",
  "Street interview voice, real, textured, imperfect, emotionally direct",
];

const REMIX_PROMPTS = [
  "Make this voice deeper, calmer, and more cinematic.",
  "Make this voice brighter, more energetic, and social-ready.",
  "Make this voice more premium, polished, and studio-clean.",
];

function labelSource(source: CustomVoiceSource) {
  if (source === "instant-clone") {
    return "Clone";
  }
  if (source === "instant-text") {
    return "Instant Voice";
  }
  if (source === "voice-remix") {
    return "Remix";
  }
  if (source === "voice-library") {
    return "Library";
  }
  return "Created";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1,
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}

function formatSeconds(seconds: number) {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
      {children}
    </label>
  );
}

function SliderField({
  label,
  min,
  max,
  step,
  value,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <FieldLabel>{label}</FieldLabel>
        <span className="text-xs font-medium text-muted-foreground">
          {value.toFixed(step < 1 ? 2 : 0)}
        </span>
      </div>
      <input
        className="w-full accent-[#3353FE]"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  );
}

function StatusBanner({
  kind,
  message,
}: {
  kind: "success" | "error";
  message: string;
}) {
  const Icon = kind === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${
        kind === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </div>
  );
}

function AudioUploadField({
  label,
  description,
  hint = "MP3, WAV, M4A, AAC, or OGG audio.",
  files,
  multiple = false,
  onFiles,
  onRemove,
}: {
  label: string;
  description: string;
  hint?: string;
  files: File[];
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  onRemove: (index: number) => void;
}) {
  const id = useId();
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);

  return (
    <div className="space-y-2">
      <FieldLabel>{label}</FieldLabel>
      <label
        htmlFor={id}
        className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-center transition hover:border-theme-primary hover:bg-[rgba(51,83,254,0.06)]"
      >
        <span className="flex size-10 items-center justify-center rounded-lg bg-[rgba(51,83,254,0.10)] text-theme-primary">
          <UploadCloud size={20} aria-hidden="true" />
        </span>
        <span className="text-sm font-semibold">{description}</span>
        <span className="text-xs text-muted-foreground">
          {hint}
        </span>
      </label>
      <input
        id={id}
        className="sr-only"
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg"
        multiple={multiple}
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />

      {files.length > 0 ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-2">
          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>
              {files.length} file{files.length === 1 ? "" : "s"}
            </span>
            <span>{formatBytes(totalSize)}</span>
          </div>
          {files.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-2 py-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <FileAudio2
                  className="size-4 shrink-0 text-theme-primary"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                onClick={() => onRemove(index)}
                aria-label={`Remove ${file.name}`}
              >
                <X size={14} aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

async function readError(response: Response) {
  try {
    const data = await response.json();
    return sanitizeVisibleMessage(data?.error?.message ?? "Request failed.");
  } catch {
    return "Request failed.";
  }
}

function sanitizeVisibleMessage(message: string) {
  if (/subscription.*instant voice cloning|instant cloning.*not enabled/i.test(message)) {
    return "Instant cloning is not enabled on this account yet. Use Instant Voice or Create Voice to make saved voices.";
  }

  return message
    .replace(/ElevenLabs/gi, "the voice engine")
    .replace(/Fal\s*MiniMax/gi, "the previous voice engine")
    .replace(/Fal/gi, "the previous voice engine");
}

async function fetchVoices() {
  const response = await fetch("/api/custom-voices");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data = (await response.json()) as { voices: CustomVoiceProfile[] };
  return data.voices;
}

async function fetchVoiceCapabilities() {
  const response = await fetch("/api/custom-voices/capabilities");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  return (await response.json()) as VoiceCapabilities;
}

async function audioResultFromResponse(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const data = (await response.json()) as {
      audio?: { url?: string; file_name?: string };
      fileName?: string;
    };
    if (!data.audio?.url) {
      throw new Error("Audio response did not include a playable URL.");
    }
    return {
      url: data.audio.url,
      fileName: data.fileName ?? data.audio.file_name ?? "threezinc-voice-output.mp3",
      label,
    };
  }

  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    fileName:
      response.headers.get("X-ThreeZinc-File-Name") ??
      "threezinc-voice-output.mp3",
    label,
  };
}

function CreditEstimateCard({
  costUsd,
}: {
  costUsd: number;
}) {
  const credits = estimateCreditsFromCostUsd(costUsd);

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-3 text-sm">
      <p className="font-semibold">Estimated credits</p>
      <p className="font-semibold text-theme-primary">{formatCredits(credits)}</p>
    </div>
  );
}

function VoiceLibraryPanel({
  voices,
  selectedVoiceId,
  loading,
  onSelect,
  onRefresh,
  onDelete,
  onRename,
}: {
  voices: CustomVoiceProfile[];
  selectedVoiceId: string;
  loading: boolean;
  onSelect: (voiceId: string) => void;
  onRefresh: () => void;
  onDelete: (voice: CustomVoiceProfile) => void;
  onRename: (voice: CustomVoiceProfile) => void;
}) {
  return (
    <aside className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Library className="size-4 text-theme-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold">Voice Library</h2>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCcw size={14} aria-hidden="true" />
          )}
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Custom voices</p>
          <p className="text-lg font-semibold">{voices.length}</p>
        </div>
        <div className="rounded-lg border border-border bg-card px-3 py-2">
          <p className="text-xs text-muted-foreground">Library</p>
          <p className="text-sm font-semibold">Local workspace</p>
        </div>
      </div>

      {voices.length === 0 ? (
        <div className="space-y-2 rounded-lg border border-dashed border-border px-3 py-5 text-sm text-muted-foreground">
          <p>No custom voices yet.</p>
          <p>
            Start with Instant Clone or Create Voice, then save a preview to use it
            here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {voices.map((voice) => {
            const selected = voice.voiceId === selectedVoiceId;
            return (
              <div
                key={voice.voiceId}
                className={`rounded-lg border p-2 transition ${
                  selected
                    ? "border-theme-primary bg-[rgba(51,83,254,0.08)]"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => onSelect(voice.voiceId)}
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{voice.name}</p>
                      <span className="rounded border border-border bg-background px-1.5 py-0.5 text-[0.68rem] font-medium text-muted-foreground">
                        {labelSource(voice.source)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {voice.description || "No description saved."}
                    </p>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onRename(voice)}
                    aria-label={`Rename ${voice.name}`}
                  >
                    <Pencil size={14} aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => onDelete(voice)}
                    aria-label={`Delete ${voice.name}`}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </Button>
                </div>
                {voice.previewUrl ? (
                  <audio
                    className="mt-2 w-full"
                    controls
                    src={voice.previewUrl}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}

function VoiceSettingsEditor({
  settings,
  onChange,
}: {
  settings: ElevenLabsVoiceSettings;
  onChange: (settings: ElevenLabsVoiceSettings) => void;
}) {
  const patch = (next: Partial<ElevenLabsVoiceSettings>) =>
    onChange({ ...settings, ...next });

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="flex items-center gap-2">
        <SlidersHorizontal
          className="size-4 text-theme-primary"
          aria-hidden="true"
        />
        <FieldLabel>Conversion Controls</FieldLabel>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <SliderField
          label="Stability"
          min={0}
          max={1}
          step={0.05}
          value={settings.stability}
          onChange={(stability) => patch({ stability })}
        />
        <SliderField
          label="Similarity"
          min={0}
          max={1}
          step={0.05}
          value={settings.similarityBoost}
          onChange={(similarityBoost) => patch({ similarityBoost })}
        />
        <SliderField
          label="Style"
          min={0}
          max={1}
          step={0.05}
          value={settings.style}
          onChange={(style) => patch({ style })}
        />
        <SliderField
          label="Speed"
          min={0.7}
          max={1.2}
          step={0.05}
          value={settings.speed}
          onChange={(speed) => patch({ speed })}
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          className="accent-[#3353FE]"
          type="checkbox"
          checked={settings.useSpeakerBoost}
          onChange={(event) =>
            patch({ useSpeakerBoost: event.target.checked })
          }
        />
        Speaker boost
      </label>
    </div>
  );
}

function PreviewGrid({
  previews,
  saveName,
  saveDescription,
  busy,
  onSaveNameChange,
  onSaveDescriptionChange,
  onSave,
}: {
  previews: VoicePreviewCandidate[];
  saveName: string;
  saveDescription: string;
  busy: boolean;
  onSaveNameChange: (value: string) => void;
  onSaveDescriptionChange: (value: string) => void;
  onSave: (preview: VoicePreviewCandidate) => void;
}) {
  const canSave = saveName.trim().length > 0 && saveDescription.trim().length >= 20;

  if (previews.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Saved voice name</FieldLabel>
          <input
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={saveName}
            onChange={(event) => onSaveNameChange(event.target.value)}
            placeholder="ThreeZinc creator voice"
          />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Saved description</FieldLabel>
          <input
            className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={saveDescription}
            onChange={(event) => onSaveDescriptionChange(event.target.value)}
            placeholder="20+ characters"
          />
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {previews.map((preview, index) => (
          <div
            key={preview.id}
            className="space-y-2 rounded-lg border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Preview {index + 1}</p>
              {preview.durationSecs ? (
                <span className="text-xs text-muted-foreground">
                  {preview.durationSecs.toFixed(1)}s
                </span>
              ) : null}
            </div>
            <audio
              className="w-full"
              controls
              src={preview.audioDataUrl ?? preview.audioUrl}
            />
            <div className="flex flex-wrap gap-2">
              <a
                className="inline-flex h-7 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                href={preview.audioDataUrl ?? preview.audioUrl}
                download={`threezinc-voice-preview-${index + 1}.mp3`}
              >
                <Download size={14} aria-hidden="true" />
                Download
              </a>
              <Button
                type="button"
                size="sm"
                disabled={busy || !canSave}
                onClick={() => onSave(preview)}
              >
                {busy ? (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <BadgeCheck size={14} aria-hidden="true" />
                )}
                Save to library
              </Button>
            </div>
          </div>
        ))}
      </div>
      {!canSave ? (
        <p className="text-xs text-muted-foreground">
          Add a name and a 20+ character description before saving.
        </p>
      ) : null}
    </div>
  );
}

export function CustomVoiceLab() {
  const [mode, setMode] = useState<LabMode>("design");
  const [voices, setVoices] = useState<CustomVoiceProfile[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyAction, setBusyAction] = useState<BusyAction | null>(null);
  const [voiceCapabilities, setVoiceCapabilities] =
    useState<VoiceCapabilities | null>(null);

  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [cloneFiles, setCloneFiles] = useState<File[]>([]);
  const [cloneConsent, setCloneConsent] = useState(false);
  const [cloneRemoveNoise, setCloneRemoveNoise] = useState(true);
  const [labelLanguage, setLabelLanguage] = useState("auto");
  const [labelAccent, setLabelAccent] = useState("");
  const [labelGender, setLabelGender] = useState("");
  const [labelUseCase, setLabelUseCase] = useState("creator");

  const [instantReferenceFiles, setInstantReferenceFiles] = useState<File[]>([]);
  const [instantReferenceDurationSecs, setInstantReferenceDurationSecs] =
    useState<number | null>(null);
  const [instantVoiceName, setInstantVoiceName] = useState("Instant clone");
  const [instantText, setInstantText] = useState("");
  const [instantDescription, setInstantDescription] = useState(
    "Uploaded reference voice cloned for local custom speech.",
  );
  const [instantCloneModel, setInstantCloneModel] = useState("speech-02-hd");
  const [instantNoiseReduction, setInstantNoiseReduction] = useState(true);
  const [instantVolumeNormalization, setInstantVolumeNormalization] =
    useState(true);

  const [speechText, setSpeechText] = useState("");
  const [speechSeed, setSpeechSeed] = useState("");

  const [voiceChangerFile, setVoiceChangerFile] = useState<File[]>([]);
  const [voiceChangerDurationSecs, setVoiceChangerDurationSecs] = useState<
    number | null
  >(null);
  const [removeNoise, setRemoveNoise] = useState(true);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);
  const [outputFormat, setOutputFormat] = useState("mp3_44100_128");
  const [seed, setSeed] = useState("");
  const [settings, setSettings] = useState<ElevenLabsVoiceSettings>(
    DEFAULT_ELEVENLABS_SETTINGS,
  );

  const [designDescription, setDesignDescription] = useState("");
  const [designLoudness, setDesignLoudness] = useState(0.5);
  const [designQuality, setDesignQuality] = useState(0.9);
  const [designGuidance, setDesignGuidance] = useState(5);
  const [designSeed, setDesignSeed] = useState("");
  const [remixDescription, setRemixDescription] = useState("");
  const [promptStrength, setPromptStrength] = useState(0.5);
  const [previews, setPreviews] = useState<VoicePreviewCandidate[]>([]);
  const [previewSource, setPreviewSource] =
    useState<CustomVoiceSource>("voice-design");
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceId === selectedVoiceId),
    [selectedVoiceId, voices],
  );

  const busy = busyAction !== null;
  const canClone =
    !busy &&
    cloneName.trim().length > 0 &&
    cloneDescription.trim().length >= 10 &&
    cloneFiles.length > 0 &&
    cloneConsent &&
    voiceCapabilities?.canUseInstantVoiceCloning !== false;
  const canInstantText =
    !busy &&
    instantReferenceFiles.length === 1 &&
    (instantReferenceDurationSecs ?? 0) >= 10 &&
    instantVoiceName.trim().length > 0 &&
    instantText.trim().length >= 1 &&
    instantText.trim().length <= 5000;
  const canSpeech =
    !busy &&
    Boolean(selectedVoiceId) &&
    speechText.trim().length > 0 &&
    speechText.trim().length <= 40000;
  const canConvert =
    !busy &&
    Boolean(selectedVoiceId) &&
    voiceChangerFile.length === 1;
  const canDesign = !busy && designDescription.trim().length >= 20;
  const canRemix =
    !busy &&
    Boolean(selectedVoiceId) &&
    selectedVoice?.provider === "elevenlabs" &&
    remixDescription.trim().length >= 5;

  const instantCostUsd = useMemo(
    () => estimateCustomVoiceTextCostUsd(countBillableCharacters(instantText)),
    [instantText],
  );
  const speechCostUsd = useMemo(
    () => estimateCustomVoiceTextCostUsd(countBillableCharacters(speechText)),
    [speechText],
  );
  const transformCostUsd = useMemo(
    () => estimateCustomVoiceTransformCostUsd(voiceChangerDurationSecs ?? 0),
    [voiceChangerDurationSecs],
  );

  const refreshVoices = useCallback(async () => {
    setBusyAction("refresh");
    try {
      const next = await fetchVoices();
      setVoices(next);
      setSelectedVoiceId((current) =>
        next.some((voice) => voice.voiceId === current)
          ? current
          : next[0]?.voiceId ?? "",
      );
      return next;
    } finally {
      setBusyAction((current) => (current === "refresh" ? null : current));
    }
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(async () => {
        await refreshVoices();
        const capabilities = await fetchVoiceCapabilities();
        setVoiceCapabilities(capabilities);
      })
      .catch((caught) => {
        setError(caught instanceof Error ? caught.message : "Could not load voices.");
      });
  }, [refreshVoices]);

  useEffect(() => {
    return () => {
      if (audioResult?.url) {
        URL.revokeObjectURL(audioResult.url);
      }
    };
  }, [audioResult]);

  useEffect(() => {
    const file = instantReferenceFiles[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      setInstantReferenceDurationSecs(
        Number.isFinite(audio.duration) ? audio.duration : null,
      );
    };
    audio.onerror = () => setInstantReferenceDurationSecs(null);

    return () => {
      URL.revokeObjectURL(objectUrl);
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };
  }, [instantReferenceFiles]);

  useEffect(() => {
    const file = voiceChangerFile[0];
    if (!file) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = new Audio(objectUrl);
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      setVoiceChangerDurationSecs(
        Number.isFinite(audio.duration) ? audio.duration : null,
      );
    };
    audio.onerror = () => setVoiceChangerDurationSecs(null);

    return () => {
      URL.revokeObjectURL(objectUrl);
      audio.onloadedmetadata = null;
      audio.onerror = null;
    };
  }, [voiceChangerFile]);

  const runAction = useCallback(
    async (actionName: BusyAction, action: () => Promise<void>) => {
      setBusyAction(actionName);
      setStatus("");
      setError("");
      try {
        await action();
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "Request failed.";
        setError(sanitizeVisibleMessage(message));
      } finally {
        setBusyAction(null);
      }
    },
    [],
  );

  const createClone = useCallback(() => {
    void runAction("clone", async () => {
      const formData = new FormData();
      formData.set("name", cloneName.trim());
      formData.set("description", cloneDescription.trim());
      formData.set("consent", String(cloneConsent));
      formData.set("removeBackgroundNoise", String(cloneRemoveNoise));
      formData.set(
        "labels",
        JSON.stringify({
          language: labelLanguage,
          accent: labelAccent.trim(),
          gender: labelGender,
          use_case: labelUseCase,
        }),
      );
      cloneFiles.forEach((file) => {
        formData.append("files", file, file.name);
      });

      const response = await fetch("/api/custom-voices/clone", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as { voice: CustomVoiceProfile };
      setCloneName("");
      setCloneDescription("");
      setCloneFiles([]);
      setCloneConsent(false);
      setStatus(`Created ${data.voice.name}.`);
      await refreshVoices();
      setSelectedVoiceId(data.voice.voiceId);
      setMode("speech");
    });
  }, [
    cloneConsent,
    cloneDescription,
    cloneFiles,
    cloneName,
    cloneRemoveNoise,
    labelAccent,
    labelGender,
    labelLanguage,
    labelUseCase,
    refreshVoices,
    runAction,
  ]);

  const createInstantTextPreviews = useCallback(() => {
    void runAction("instant-text", async () => {
      const formData = new FormData();
      formData.set("voiceName", instantVoiceName.trim());
      formData.set("description", instantDescription.trim());
      formData.set("text", instantText.trim());
      formData.set("model", instantCloneModel);
      formData.set("noiseReduction", String(instantNoiseReduction));
      formData.set("volumeNormalization", String(instantVolumeNormalization));
      if (instantReferenceFiles[0]) {
        formData.set(
          "referenceAudio",
          instantReferenceFiles[0],
          instantReferenceFiles[0].name,
        );
      }

      const response = await fetch("/api/custom-voices/instant-clone", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as {
        audio: { url: string; file_name?: string };
        voice: CustomVoiceProfile;
      };
      setAudioResult({
        url: data.audio.url,
        fileName: data.audio.file_name ?? "threezinc-instant-clone.mp3",
        label: "Instant clone output",
      });
      const next = await refreshVoices();
      setSelectedVoiceId(data.voice.voiceId);
      setStatus(`Cloned and saved ${data.voice.name}.`);
      if (next.length === 0) {
        await refreshVoices();
      }
    });
  }, [
      instantDescription,
      instantCloneModel,
      instantNoiseReduction,
      instantReferenceFiles,
      instantText,
      instantVoiceName,
      instantVolumeNormalization,
      refreshVoices,
      runAction,
    ]);

  const generateSpeech = useCallback(() => {
    void runAction("speech", async () => {
      setAudioResult(null);
      const response = await fetch("/api/custom-voices/speech", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          text: speechText.trim(),
          outputFormat,
          seed: speechSeed ? Number(speechSeed) : undefined,
          settings,
        }),
      });
      setAudioResult(await audioResultFromResponse(response, "Generated speech"));
      setStatus("Generated speech with the selected voice.");
    });
  }, [
    outputFormat,
    runAction,
    selectedVoiceId,
    settings,
    speechSeed,
    speechText,
  ]);

  const runVoiceChanger = useCallback(() => {
    void runAction("changer", async () => {
      setAudioResult(null);
      const formData = new FormData();
      formData.set("voiceId", selectedVoiceId);
      formData.set("outputFormat", outputFormat);
      formData.set("removeBackgroundNoise", String(removeNoise));
      formData.set("settings", JSON.stringify(settings));
      if (seed) {
        formData.set("seed", seed);
      }
      if (voiceChangerFile[0]) {
        formData.set("audio", voiceChangerFile[0], voiceChangerFile[0].name);
      }

      const response = await fetch("/api/custom-voices/voice-changer", {
        method: "POST",
        body: formData,
      });
      setAudioResult(await audioResultFromResponse(response, "Transformed audio"));
      setStatus("Converted source performance.");
    });
  }, [
    outputFormat,
    removeNoise,
    runAction,
    seed,
    selectedVoiceId,
    settings,
    voiceChangerFile,
  ]);

  const createDesignPreviews = useCallback(() => {
    void runAction("design", async () => {
      const response = await fetch("/api/custom-voices/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: designDescription.trim(),
          loudness: designLoudness,
          quality: designQuality,
          guidanceScale: designGuidance,
          seed: designSeed ? Number(designSeed) : undefined,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as {
        previews: VoicePreviewCandidate[];
        text?: string;
      };
      setPreviews(data.previews);
      setPreviewSource("voice-design");
      setSaveName(`Designed voice ${voices.length + 1}`);
      setSaveDescription(designDescription.trim());
      setStatus("Created voice previews.");
    });
  }, [
    designDescription,
    designGuidance,
    designLoudness,
    designQuality,
    designSeed,
    runAction,
    voices.length,
  ]);

  const createRemixPreviews = useCallback(() => {
    void runAction("remix", async () => {
      const response = await fetch("/api/custom-voices/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          description: remixDescription.trim(),
          promptStrength,
        }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as {
        previews: VoicePreviewCandidate[];
      };
      setPreviews(data.previews);
      setPreviewSource("voice-remix");
      setSaveName(`${selectedVoice?.name ?? "Custom voice"} remix`);
      setSaveDescription(remixDescription.trim());
      setStatus("Generated remix previews.");
    });
  }, [
    promptStrength,
    remixDescription,
    runAction,
    selectedVoice?.name,
    selectedVoiceId,
  ]);

  const savePreview = useCallback(
    (preview: VoicePreviewCandidate) => {
      void runAction("save", async () => {
        const response = await fetch("/api/custom-voices/save-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatedVoiceId: preview.generatedVoiceId,
            name: saveName.trim(),
            description: saveDescription.trim(),
            source: previewSource,
          }),
        });
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        const data = (await response.json()) as { voice: CustomVoiceProfile };
        setStatus(`Saved ${data.voice.name}.`);
        setPreviews([]);
        await refreshVoices();
        setSelectedVoiceId(data.voice.voiceId);
        setMode("speech");
      });
    },
    [previewSource, refreshVoices, runAction, saveDescription, saveName],
  );

  const deleteVoice = useCallback(
    (voice: CustomVoiceProfile) => {
      if (!window.confirm(`Delete ${voice.name} from this voice library?`)) {
        return;
      }

      void runAction("delete", async () => {
        const response = await fetch(
          `/api/custom-voices/${encodeURIComponent(voice.voiceId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        setStatus(`Deleted ${voice.name}.`);
        const next = await refreshVoices();
        setSelectedVoiceId(next[0]?.voiceId ?? "");
      });
    },
    [refreshVoices, runAction],
  );

  const renameVoice = useCallback(
    (voice: CustomVoiceProfile) => {
      const nextName = window.prompt("Rename voice", voice.name)?.trim();
      if (!nextName || nextName === voice.name) {
        return;
      }

      void runAction("save", async () => {
        const response = await fetch(
          `/api/custom-voices/${encodeURIComponent(voice.voiceId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: nextName }),
          },
        );
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        setStatus(`Renamed ${voice.name} to ${nextName}.`);
        await refreshVoices();
      });
    },
    [refreshVoices, runAction],
  );

  return (
    <section className="space-y-5">
      <div className="rounded-lg border border-border bg-background/90 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-theme-gradient-button text-white">
                <Mic2 size={18} aria-hidden="true" />
              </div>
              <div>
                <h1 className="font-heading text-xl font-semibold">
                  Voice Lab
                </h1>
                <p className="text-sm text-muted-foreground">
                  Create, save, transform, and reuse custom ThreeZinc voices.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-muted-foreground">Flow</p>
              <p className="font-semibold">Design first</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-muted-foreground">Keys</p>
              <p className="font-semibold">Private server</p>
            </div>
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="text-muted-foreground">Audio storage</p>
              <p className="font-semibold">Transient output</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <VoiceLibraryPanel
          voices={voices}
          selectedVoiceId={selectedVoiceId}
          loading={busyAction === "refresh"}
          onSelect={setSelectedVoiceId}
          onRefresh={() => {
            setError("");
            setStatus("");
            void refreshVoices().catch((caught) => {
              setError(
                caught instanceof Error ? caught.message : "Could not refresh voices.",
              );
            });
          }}
          onDelete={deleteVoice}
          onRename={renameVoice}
        />

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 text-sm sm:grid-cols-5">
            {[
              ["design", "Create Voice"],
              ["instant-text", "Clone Voice"],
              ["speech", "Use Voice"],
              ["changer", "Transform Voice"],
              ["remix", "Remix"],
            ].map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`rounded-md px-3 py-2 font-medium transition ${
                  mode === id
                    ? "bg-theme-primary text-white"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                onClick={() => {
                  setMode(id as LabMode);
                  setError("");
                  setStatus("");
                  setAudioResult(null);
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {status ? <StatusBanner kind="success" message={status} /> : null}
          {error ? <StatusBanner kind="error" message={error} /> : null}

          {mode === "clone" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">
                  Instant Voice Clone
                </h2>
              </div>

              {voiceCapabilities?.canUseInstantVoiceCloning === false ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  Instant cloning is not enabled on this account yet. Use Instant
                  Voice or Create Voice to make saved voices now.
                </div>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>Voice name</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={cloneName}
                    onChange={(event) => setCloneName(event.target.value)}
                    placeholder="Creator voice"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Accent label</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={labelAccent}
                    onChange={(event) => setLabelAccent(event.target.value)}
                    placeholder="Indian English, Hindi, neutral"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Description</FieldLabel>
                <textarea
                  className="min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={cloneDescription}
                  onChange={(event) => setCloneDescription(event.target.value)}
                  placeholder="Describe tone, texture, accent, and ideal use case."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel>Language label</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={labelLanguage}
                    onChange={(event) => setLabelLanguage(event.target.value)}
                  >
                    <option value="auto">Auto</option>
                    <option value="en">English</option>
                    <option value="hi">Hindi</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Gender label</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={labelGender}
                    onChange={(event) => setLabelGender(event.target.value)}
                  >
                    <option value="">Unspecified</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="neutral">Neutral</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Use case</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={labelUseCase}
                    onChange={(event) => setLabelUseCase(event.target.value)}
                  >
                    <option value="creator">Creator</option>
                    <option value="ads">Ads</option>
                    <option value="narration">Narration</option>
                    <option value="character">Character</option>
                    <option value="training">Training</option>
                  </select>
                </div>
              </div>

              <AudioUploadField
                label="Voice samples"
                description="Upload voice samples"
                files={cloneFiles}
                multiple
                onFiles={(files) => setCloneFiles((current) => [...current, ...files])}
                onRemove={(index) =>
                  setCloneFiles((current) =>
                    current.filter((_, fileIndex) => fileIndex !== index),
                  )
                }
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm">
                  <input
                    className="mt-0.5 accent-[#3353FE]"
                    type="checkbox"
                    checked={cloneRemoveNoise}
                    onChange={(event) => setCloneRemoveNoise(event.target.checked)}
                  />
                  <span>
                    Remove background noise from samples
                    <span className="block text-xs text-muted-foreground">
                      Best for noisy recordings.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm">
                  <input
                    className="mt-0.5 accent-[#3353FE]"
                    type="checkbox"
                    checked={cloneConsent}
                    onChange={(event) => setCloneConsent(event.target.checked)}
                  />
                  <span>
                    I own this voice or have permission to clone it.
                    <span className="block text-xs text-muted-foreground">
                      Required before upload.
                    </span>
                  </span>
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.22)] hover:brightness-105"
                  disabled={!canClone}
                  onClick={createClone}
                >
                  {busyAction === "clone" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic2 size={14} aria-hidden="true" />
                  )}
                  {busyAction === "clone" ? "Creating clone..." : "Create clone"}
                </Button>
                {!canClone ? (
                  <span className="text-xs text-muted-foreground">
                    {voiceCapabilities?.canUseInstantVoiceCloning === false
                      ? "Instant cloning needs to be enabled on the voice account."
                      : "Add name, description, samples, and consent to enable cloning."}
                  </span>
                ) : null}
              </div>
            </section>
          ) : null}

          {mode === "instant-text" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">
                  Instant Voice Clone
                </h2>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm text-muted-foreground">
                Upload a clear 10+ second reference voice, type the words you want
                spoken, and get cloned speech back immediately. The cloned voice is
                also added to your local library for reuse.
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>Voice name</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={instantVoiceName}
                    onChange={(event) => setInstantVoiceName(event.target.value)}
                    placeholder="Raza voice"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Clone model</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={instantCloneModel}
                    onChange={(event) => setInstantCloneModel(event.target.value)}
                  >
                    {INSTANT_CLONE_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <AudioUploadField
                label="Reference voice"
                description="Upload reference voice"
                hint="MP3, WAV, M4A, AAC, or OGG. Use 10+ seconds of clean speech."
                files={instantReferenceFiles}
                onFiles={(files) => {
                  setInstantReferenceDurationSecs(null);
                  setInstantReferenceFiles(files.slice(0, 1));
                }}
                onRemove={() => {
                  setInstantReferenceDurationSecs(null);
                  setInstantReferenceFiles([]);
                }}
              />
              {instantReferenceFiles.length > 0 ? (
                <div
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    (instantReferenceDurationSecs ?? 0) >= 10
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {instantReferenceDurationSecs === null
                    ? "Checking reference length..."
                    : instantReferenceDurationSecs >= 10
                      ? `Reference length ${formatSeconds(instantReferenceDurationSecs)}. Ready for cloning.`
                      : `Reference length ${formatSeconds(instantReferenceDurationSecs)}. Upload at least 10 seconds of clear speech.`}
                </div>
              ) : null}

              <div className="space-y-1.5">
                <FieldLabel>Target text</FieldLabel>
                <textarea
                  className="min-h-36 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={instantText}
                  onChange={(event) => setInstantText(event.target.value)}
                  placeholder="Type the exact words for the uploaded voice to say."
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>
                    {instantText.trim().length === 0
                      ? "Add target text."
                      : "Ready length."}
                  </span>
                  <span>{instantText.trim().length}/5000</span>
                </div>
              </div>

              <CreditEstimateCard costUsd={instantCostUsd} />

              <div className="space-y-1.5">
                <FieldLabel>Voice notes</FieldLabel>
                <textarea
                  className="min-h-20 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={instantDescription}
                  onChange={(event) => setInstantDescription(event.target.value)}
                  placeholder="Optional notes for your local voice library."
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm">
                  <input
                    className="mt-0.5 accent-[#3353FE]"
                    type="checkbox"
                    checked={instantNoiseReduction}
                    onChange={(event) =>
                      setInstantNoiseReduction(event.target.checked)
                    }
                  />
                  <span>Clean background noise</span>
                </label>
                <label className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-3 text-sm">
                  <input
                    className="mt-0.5 accent-[#3353FE]"
                    type="checkbox"
                    checked={instantVolumeNormalization}
                    onChange={(event) =>
                      setInstantVolumeNormalization(event.target.checked)
                    }
                  />
                  <span>Normalize volume</span>
                </label>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.22)] hover:brightness-105"
                  disabled={!canInstantText}
                  onClick={createInstantTextPreviews}
                >
                  {busyAction === "instant-text" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Sparkles size={14} aria-hidden="true" />
                  )}
                  {busyAction === "instant-text"
                    ? "Cloning..."
                    : "Clone voice and generate"}
                </Button>
                {!canInstantText ? (
                  <span className="text-xs text-muted-foreground">
                    Add a voice name, upload 10+ seconds of reference audio, and enter target text.
                  </span>
                ) : null}
              </div>

              {audioResult ? (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <FieldLabel>{audioResult.label}</FieldLabel>
                  <audio className="w-full" controls src={audioResult.url} />
                  <a
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                    href={audioResult.url}
                    download={audioResult.fileName}
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {mode === "speech" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Mic2 className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">Use Voice</h2>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground">Selected voice</p>
                    <p className="font-semibold">
                      {selectedVoice?.name ?? "Select or create a custom voice"}
                    </p>
                  </div>
                  {selectedVoice ? (
                    <span className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                      {labelSource(selectedVoice.source)}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Script</FieldLabel>
                <textarea
                  className="min-h-40 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={speechText}
                  onChange={(event) => setSpeechText(event.target.value)}
                  placeholder="Type what the selected custom voice should say."
                />
                <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                  <span>{speechText.trim().length === 0 ? "Add script text." : "Ready."}</span>
                  <span>{speechText.trim().length.toLocaleString()}/40,000</span>
                </div>
              </div>

              <CreditEstimateCard
                costUsd={speechCostUsd}
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <FieldLabel>Output</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value)}
                  >
                    {OUTPUT_OPTIONS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Seed</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={speechSeed}
                    onChange={(event) =>
                      setSpeechSeed(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <VoiceSettingsEditor settings={settings} onChange={setSettings} />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.22)] hover:brightness-105"
                  disabled={!canSpeech}
                  onClick={generateSpeech}
                >
                  {busyAction === "speech" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Mic2 size={14} aria-hidden="true" />
                  )}
                  {busyAction === "speech" ? "Generating..." : "Generate speech"}
                </Button>
                {!canSpeech ? (
                  <span className="text-xs text-muted-foreground">
                    Select a saved voice and enter text.
                  </span>
                ) : null}
              </div>

              {audioResult ? (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <FieldLabel>{audioResult.label}</FieldLabel>
                  <audio className="w-full" controls src={audioResult.url} />
                  <a
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                    href={audioResult.url}
                    download={audioResult.fileName}
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {mode === "changer" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Wand2 className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">
                  Transform Audio
                </h2>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-muted-foreground">Target voice</p>
                    <p className="font-semibold">
                      {selectedVoice?.name ?? "Select or create a custom voice"}
                    </p>
                  </div>
                  {selectedVoice ? (
                    <span className="rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground">
                      {labelSource(selectedVoice.source)}
                    </span>
                  ) : null}
                </div>
              </div>

              <AudioUploadField
                label="Source performance"
                description="Upload performance audio"
                files={voiceChangerFile}
                onFiles={(files) => {
                  setVoiceChangerDurationSecs(null);
                  setVoiceChangerFile(files.slice(0, 1));
                }}
                onRemove={() => {
                  setVoiceChangerDurationSecs(null);
                  setVoiceChangerFile([]);
                }}
              />

              <CreditEstimateCard
                costUsd={transformCostUsd}
              />

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <FieldLabel>Output</FieldLabel>
                  <select
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={outputFormat}
                    onChange={(event) => setOutputFormat(event.target.value)}
                  >
                    {OUTPUT_OPTIONS.map((format) => (
                      <option key={format.id} value={format.id}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Seed</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={seed}
                    onChange={(event) => setSeed(event.target.value.replace(/\D/g, ""))}
                    placeholder="Optional"
                  />
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                  <input
                    className="accent-[#3353FE]"
                    type="checkbox"
                    checked={removeNoise}
                    onChange={(event) => setRemoveNoise(event.target.checked)}
                  />
                  Clean source noise
                </label>
              </div>

              <VoiceSettingsEditor settings={settings} onChange={setSettings} />

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button
                  type="button"
                  className="bg-theme-gradient-button text-white shadow-[0_4px_16px_rgba(31,76,238,0.22)] hover:brightness-105"
                  disabled={!canConvert}
                  onClick={runVoiceChanger}
                >
                  {busyAction === "changer" ? (
                    <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Wand2 size={14} aria-hidden="true" />
                  )}
                  {busyAction === "changer" ? "Transforming..." : "Transform audio"}
                </Button>
                {!canConvert ? (
                  <span className="text-xs text-muted-foreground">
                    Select a target voice and upload source audio.
                  </span>
                ) : null}
              </div>

              {audioResult ? (
                <div className="space-y-2 rounded-lg border border-border bg-card p-3">
                  <FieldLabel>{audioResult.label}</FieldLabel>
                  <audio className="w-full" controls src={audioResult.url} />
                  <a
                    className="inline-flex h-8 items-center justify-center gap-1 rounded-md border border-border bg-background px-2.5 text-[0.8rem] font-medium transition hover:bg-muted"
                    href={audioResult.url}
                    download={audioResult.fileName}
                  >
                    <Download size={14} aria-hidden="true" />
                    Download
                  </a>
                </div>
              ) : null}
            </section>
          ) : null}

          {mode === "design" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">
                  Create New Voice
                </h2>
              </div>

              <div className="space-y-2">
                <FieldLabel>Voice direction</FieldLabel>
                <textarea
                  className="min-h-28 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={designDescription}
                  onChange={(event) => setDesignDescription(event.target.value)}
                  placeholder="Describe the custom voice you want to generate."
                />
                <div className="flex flex-wrap gap-1.5">
                  {DESIGN_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition hover:border-theme-primary hover:text-theme-primary"
                      onClick={() => setDesignDescription(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <SliderField
                  label="Loudness"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={designLoudness}
                  onChange={setDesignLoudness}
                />
                <SliderField
                  label="Quality"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={designQuality}
                  onChange={setDesignQuality}
                />
                <SliderField
                  label="Guidance"
                  min={0}
                  max={20}
                  step={0.5}
                  value={designGuidance}
                  onChange={setDesignGuidance}
                />
                <div className="space-y-1.5">
                  <FieldLabel>Seed</FieldLabel>
                  <input
                    className="h-9 w-full rounded-md border border-border bg-card px-3 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                    value={designSeed}
                    onChange={(event) =>
                      setDesignSeed(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Optional"
                  />
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                disabled={!canDesign}
                onClick={createDesignPreviews}
              >
                {busyAction === "design" ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Sparkles size={14} aria-hidden="true" />
                )}
                {busyAction === "design" ? "Generating..." : "Create previews"}
              </Button>

              <PreviewGrid
                previews={previewSource === "voice-design" ? previews : []}
                saveName={saveName}
                saveDescription={saveDescription}
                busy={busyAction === "save"}
                onSaveNameChange={setSaveName}
                onSaveDescriptionChange={setSaveDescription}
                onSave={savePreview}
              />
            </section>
          ) : null}

          {mode === "remix" ? (
            <section className="space-y-4 rounded-lg border border-border bg-background/90 p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Wand2 className="size-4 text-theme-primary" aria-hidden="true" />
                <h2 className="font-heading text-lg font-semibold">Voice Remix</h2>
              </div>

              <div className="rounded-lg border border-border bg-card px-3 py-3 text-sm">
                <p className="text-muted-foreground">Base voice</p>
                <p className="font-semibold">
                  {selectedVoice?.name ?? "Select a custom voice first"}
                </p>
              </div>

              {selectedVoice?.provider === "fal" ? (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  Uploaded instant clones can speak typed text. Remix currently
                  works with created or imported library voices.
                </div>
              ) : null}

              <div className="space-y-2">
                <FieldLabel>Remix direction</FieldLabel>
                <textarea
                  className="min-h-24 w-full resize-y rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                  value={remixDescription}
                  onChange={(event) => setRemixDescription(event.target.value)}
                  placeholder="Make the selected voice calmer, deeper, brighter, younger, or more cinematic."
                />
                <div className="flex flex-wrap gap-1.5">
                  {REMIX_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      className="rounded border border-border bg-card px-2 py-1 text-xs text-muted-foreground transition hover:border-theme-primary hover:text-theme-primary"
                      onClick={() => setRemixDescription(prompt)}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>

              <SliderField
                label="Prompt Strength"
                min={0}
                max={1}
                step={0.05}
                value={promptStrength}
                onChange={setPromptStrength}
              />

              <Button
                type="button"
                variant="outline"
                disabled={!canRemix}
                onClick={createRemixPreviews}
              >
                {busyAction === "remix" ? (
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Wand2 size={14} aria-hidden="true" />
                )}
                {busyAction === "remix" ? "Generating..." : "Generate remix previews"}
              </Button>

              <PreviewGrid
                previews={previewSource === "voice-remix" ? previews : []}
                saveName={saveName}
                saveDescription={saveDescription}
                busy={busyAction === "save"}
                onSaveNameChange={setSaveName}
                onSaveDescriptionChange={setSaveDescription}
                onSave={savePreview}
              />
            </section>
          ) : null}

        </div>
      </div>
    </section>
  );
}
