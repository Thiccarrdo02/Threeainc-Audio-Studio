"use client";

import {
  Download,
  Mic2,
  RefreshCcw,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  DEFAULT_ELEVENLABS_SETTINGS,
  type CustomVoiceProfile,
  type CustomVoiceSource,
  type ElevenLabsVoiceSettings,
  type VoicePreviewCandidate,
} from "@/types/custom-voices";

type LabMode = "clone" | "tts" | "changer" | "design";

interface AudioResult {
  url: string;
  fileName: string;
  label: string;
}

const MODEL_OPTIONS = [
  { id: "eleven_multilingual_v2", label: "Multilingual v2" },
  { id: "eleven_flash_v2_5", label: "Flash v2.5" },
  { id: "eleven_turbo_v2_5", label: "Turbo v2.5" },
];

const OUTPUT_OPTIONS = [
  { id: "mp3_44100_128", label: "MP3 44.1k" },
  { id: "mp3_22050_32", label: "Small MP3" },
];

const LANGUAGE_OPTIONS = [
  { id: "", label: "Auto" },
  { id: "en", label: "English" },
  { id: "hi", label: "Hindi" },
];

function labelSource(source: CustomVoiceSource) {
  if (source === "instant-clone") {
    return "Clone";
  }
  if (source === "voice-remix") {
    return "Remix";
  }
  return "Design";
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

async function readError(response: Response) {
  try {
    const data = await response.json();
    return data?.error?.message ?? "Request failed.";
  } catch {
    return "Request failed.";
  }
}

async function fetchVoices() {
  const response = await fetch("/api/custom-voices");
  if (!response.ok) {
    throw new Error(await readError(response));
  }
  const data = (await response.json()) as { voices: CustomVoiceProfile[] };
  return data.voices;
}

async function audioResultFromResponse(response: Response, label: string) {
  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const blob = await response.blob();
  return {
    url: URL.createObjectURL(blob),
    fileName:
      response.headers.get("X-ThreeZinc-File-Name") ??
      "threezinc-elevenlabs-audio.mp3",
    label,
  };
}

export function CustomVoiceLab({ studioPrompt }: { studioPrompt: string }) {
  const [mode, setMode] = useState<LabMode>("clone");
  const [voices, setVoices] = useState<CustomVoiceProfile[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [cloneName, setCloneName] = useState("");
  const [cloneDescription, setCloneDescription] = useState("");
  const [cloneFiles, setCloneFiles] = useState<FileList | null>(null);
  const [cloneConsent, setCloneConsent] = useState(false);

  const [ttsText, setTtsText] = useState("");
  const [modelId, setModelId] = useState("eleven_multilingual_v2");
  const [languageCode, setLanguageCode] = useState("");
  const [outputFormat, setOutputFormat] = useState("mp3_44100_128");
  const [seed, setSeed] = useState("");
  const [settings, setSettings] = useState<ElevenLabsVoiceSettings>(
    DEFAULT_ELEVENLABS_SETTINGS,
  );

  const [voiceChangerFile, setVoiceChangerFile] = useState<File | null>(null);
  const [removeNoise, setRemoveNoise] = useState(true);
  const [audioResult, setAudioResult] = useState<AudioResult | null>(null);

  const [designDescription, setDesignDescription] = useState("");
  const [remixDescription, setRemixDescription] = useState("");
  const [promptStrength, setPromptStrength] = useState(0.5);
  const [previews, setPreviews] = useState<VoicePreviewCandidate[]>([]);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");

  const selectedVoice = useMemo(
    () => voices.find((voice) => voice.voiceId === selectedVoiceId),
    [selectedVoiceId, voices],
  );

  const refreshVoices = useCallback(async () => {
    const next = await fetchVoices();
    setVoices(next);
    setSelectedVoiceId((current) => current || next[0]?.voiceId || "");
  }, []);

  useEffect(() => {
    void Promise.resolve()
      .then(refreshVoices)
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

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      setBusy(true);
      setStatus("");
      setError("");
      try {
        await action();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Request failed.");
      } finally {
        setBusy(false);
      }
    },
    [],
  );

  const createClone = useCallback(() => {
    void runAction(async () => {
      const formData = new FormData();
      formData.set("name", cloneName);
      formData.set("description", cloneDescription);
      formData.set("consent", String(cloneConsent));
      Array.from(cloneFiles ?? []).forEach((file) => {
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
      setCloneFiles(null);
      setCloneConsent(false);
      setStatus(`Created ${data.voice.name}.`);
      await refreshVoices();
      setSelectedVoiceId(data.voice.voiceId);
      setMode("tts");
    });
  }, [
    cloneConsent,
    cloneDescription,
    cloneFiles,
    cloneName,
    refreshVoices,
    runAction,
  ]);

  const generateTts = useCallback(() => {
    void runAction(async () => {
      const response = await fetch("/api/custom-voices/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          text: ttsText.trim() || studioPrompt.trim(),
          modelId,
          languageCode,
          outputFormat,
          seed: seed ? Number(seed) : undefined,
          settings,
        }),
      });
      setAudioResult(await audioResultFromResponse(response, "Custom voice TTS"));
      setStatus("Generated custom voice audio.");
    });
  }, [
    languageCode,
    modelId,
    outputFormat,
    runAction,
    seed,
    selectedVoiceId,
    settings,
    studioPrompt,
    ttsText,
  ]);

  const runVoiceChanger = useCallback(() => {
    void runAction(async () => {
      const formData = new FormData();
      formData.set("voiceId", selectedVoiceId);
      formData.set("outputFormat", outputFormat);
      formData.set("removeBackgroundNoise", String(removeNoise));
      formData.set("settings", JSON.stringify(settings));
      if (seed) {
        formData.set("seed", seed);
      }
      if (voiceChangerFile) {
        formData.set("audio", voiceChangerFile, voiceChangerFile.name);
      }

      const response = await fetch("/api/custom-voices/voice-changer", {
        method: "POST",
        body: formData,
      });
      setAudioResult(await audioResultFromResponse(response, "Voice changer"));
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
    void runAction(async () => {
      const response = await fetch("/api/custom-voices/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: designDescription }),
      });
      if (!response.ok) {
        throw new Error(await readError(response));
      }
      const data = (await response.json()) as {
        previews: VoicePreviewCandidate[];
      };
      setPreviews(data.previews);
      setSaveDescription(designDescription);
      setStatus("Generated voice design previews.");
    });
  }, [designDescription, runAction]);

  const createRemixPreviews = useCallback(() => {
    void runAction(async () => {
      const response = await fetch("/api/custom-voices/remix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId: selectedVoiceId,
          description: remixDescription,
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
      setSaveDescription(remixDescription);
      setStatus("Generated remix previews.");
    });
  }, [promptStrength, remixDescription, runAction, selectedVoiceId]);

  const savePreview = useCallback(
    (preview: VoicePreviewCandidate, source: CustomVoiceSource) => {
      void runAction(async () => {
        const response = await fetch("/api/custom-voices/save-generated", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatedVoiceId: preview.generatedVoiceId,
            name: saveName,
            description: saveDescription,
            source,
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
      });
    },
    [refreshVoices, runAction, saveDescription, saveName],
  );

  const deleteVoice = useCallback(
    (voice: CustomVoiceProfile) => {
      if (!window.confirm(`Delete ${voice.name} from ElevenLabs and this local library?`)) {
        return;
      }

      void runAction(async () => {
        const response = await fetch(
          `/api/custom-voices/${encodeURIComponent(voice.voiceId)}`,
          { method: "DELETE" },
        );
        if (!response.ok) {
          throw new Error(await readError(response));
        }
        setStatus(`Deleted ${voice.name}.`);
        await refreshVoices();
        setSelectedVoiceId("");
      });
    },
    [refreshVoices, runAction],
  );

  return (
    <section className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <Mic2 size={16} className="text-theme-primary" aria-hidden="true" />
          <h2 className="font-heading text-lg font-semibold">Custom Voice Lab</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          ElevenLabs local voice cloning, design, remix, and voice changer.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg border border-border bg-card p-1 text-xs sm:grid-cols-4">
        {[
          ["clone", "Clone"],
          ["tts", "TTS"],
          ["changer", "Changer"],
          ["design", "Design"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={`rounded-md px-2 py-1.5 font-medium transition ${
              mode === id
                ? "bg-theme-primary text-white"
                : "text-muted-foreground hover:bg-muted"
            }`}
            onClick={() => setMode(id as LabMode)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2 rounded-lg border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <FieldLabel>My Custom Voices</FieldLabel>
          <Button type="button" variant="outline" size="sm" onClick={() => void refreshVoices()}>
            <RefreshCcw size={13} aria-hidden="true" />
            Refresh
          </Button>
        </div>
        {voices.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No local custom voices yet.
          </p>
        ) : (
          <div className="space-y-2">
            <select
              className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={selectedVoiceId}
              onChange={(event) => setSelectedVoiceId(event.target.value)}
              aria-label="Select custom voice"
            >
              {voices.map((voice) => (
                <option key={voice.voiceId} value={voice.voiceId}>
                  {voice.name} - {labelSource(voice.source)}
                </option>
              ))}
            </select>
            {selectedVoice ? (
              <div className="rounded-md border border-border bg-background px-2 py-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold">{selectedVoice.name}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {selectedVoice.description}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    onClick={() => deleteVoice(selectedVoice)}
                    aria-label={`Delete ${selectedVoice.name}`}
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {mode === "clone" ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-3">
          <FieldLabel>Instant Clone</FieldLabel>
          <input
            className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={cloneName}
            onChange={(event) => setCloneName(event.target.value)}
            placeholder="Voice name"
          />
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={cloneDescription}
            onChange={(event) => setCloneDescription(event.target.value)}
            placeholder="Describe the voice tone, accent, and use case."
          />
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs"
            type="file"
            accept="audio/*"
            multiple
            onChange={(event) => setCloneFiles(event.target.files)}
          />
          <label className="flex items-start gap-2 text-xs text-muted-foreground">
            <input
              className="mt-0.5 accent-[#3353FE]"
              type="checkbox"
              checked={cloneConsent}
              onChange={(event) => setCloneConsent(event.target.checked)}
            />
            I own this voice or have permission to clone it.
          </label>
          <Button
            type="button"
            className="w-full bg-theme-gradient-button text-white"
            disabled={busy}
            onClick={createClone}
          >
            <Mic2 size={14} aria-hidden="true" />
            Create Clone
          </Button>
        </div>
      ) : null}

      {mode === "tts" ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <FieldLabel>Custom Voice TTS</FieldLabel>
          <textarea
            className="min-h-28 w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={ttsText}
            onChange={(event) => setTtsText(event.target.value)}
            placeholder="Text for the selected custom voice."
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTtsText(studioPrompt)}
          >
            Use studio script
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={modelId}
              onChange={(event) => setModelId(event.target.value)}
              aria-label="ElevenLabs model"
            >
              {MODEL_OPTIONS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={languageCode}
              onChange={(event) => setLanguageCode(event.target.value)}
              aria-label="ElevenLabs language"
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language.id} value={language.id}>
                  {language.label}
                </option>
              ))}
            </select>
            <select
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={outputFormat}
              onChange={(event) => setOutputFormat(event.target.value)}
              aria-label="ElevenLabs output format"
            >
              {OUTPUT_OPTIONS.map((format) => (
                <option key={format.id} value={format.id}>
                  {format.label}
                </option>
              ))}
            </select>
            <input
              className="h-9 rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
              value={seed}
              onChange={(event) => setSeed(event.target.value.replace(/\D/g, ""))}
              placeholder="Optional seed"
            />
          </div>
          <VoiceSettingsEditor settings={settings} onChange={setSettings} />
          <Button
            type="button"
            className="w-full bg-theme-gradient-button text-white"
            disabled={busy || !selectedVoiceId}
            onClick={generateTts}
          >
            <Sparkles size={14} aria-hidden="true" />
            Generate Custom Voice
          </Button>
        </div>
      ) : null}

      {mode === "changer" ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <FieldLabel>Voice Changer</FieldLabel>
          <input
            className="w-full rounded-md border border-border bg-background px-2 py-2 text-xs"
            type="file"
            accept="audio/*"
            onChange={(event) =>
              setVoiceChangerFile(event.target.files?.[0] ?? null)
            }
          />
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              className="accent-[#3353FE]"
              type="checkbox"
              checked={removeNoise}
              onChange={(event) => setRemoveNoise(event.target.checked)}
            />
            Remove background noise before conversion
          </label>
          <VoiceSettingsEditor settings={settings} onChange={setSettings} />
          <Button
            type="button"
            className="w-full bg-theme-gradient-button text-white"
            disabled={busy || !selectedVoiceId}
            onClick={runVoiceChanger}
          >
            <Wand2 size={14} aria-hidden="true" />
            Convert Performance
          </Button>
        </div>
      ) : null}

      {mode === "design" ? (
        <div className="space-y-3 rounded-lg border border-border bg-card p-3">
          <FieldLabel>Voice Design</FieldLabel>
          <textarea
            className="min-h-20 w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={designDescription}
            onChange={(event) => setDesignDescription(event.target.value)}
            placeholder="Example: A warm Indian English creator voice, confident, polished, friendly."
          />
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={createDesignPreviews}
          >
            Generate Designed Voice Previews
          </Button>

          <FieldLabel>Remix Selected Voice</FieldLabel>
          <textarea
            className="min-h-16 w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
            value={remixDescription}
            onChange={(event) => setRemixDescription(event.target.value)}
            placeholder="Make it deeper, calmer, more cinematic, or more energetic."
          />
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
            disabled={busy || !selectedVoiceId}
            onClick={createRemixPreviews}
          >
            Generate Remix Previews
          </Button>
          {previews.length > 0 ? (
            <div className="space-y-2">
              <input
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                placeholder="Saved voice name"
              />
              <textarea
                className="min-h-16 w-full rounded-md border border-border bg-background px-2 py-2 text-sm outline-none focus:border-theme-primary focus:ring-3 focus:ring-theme-accent/20"
                value={saveDescription}
                onChange={(event) => setSaveDescription(event.target.value)}
                placeholder="Saved voice description"
              />
              {previews.map((preview, index) => (
                <div
                  key={preview.id}
                  className="space-y-2 rounded-md border border-border bg-background p-2"
                >
                  <p className="text-xs font-medium">Preview {index + 1}</p>
                  <audio className="w-full" controls src={preview.audioDataUrl} />
                  <Button
                    type="button"
                    size="sm"
                    disabled={busy}
                    onClick={() =>
                      savePreview(
                        preview,
                        remixDescription ? "voice-remix" : "voice-design",
                      )
                    }
                  >
                    Save this voice
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

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

      {status ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          {status}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      ) : null}
    </section>
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
      <label className="flex items-center gap-2 text-xs text-muted-foreground sm:col-span-2">
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
