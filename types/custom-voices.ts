export type CustomVoiceSource = "instant-clone" | "voice-design" | "voice-remix";

export interface ElevenLabsVoiceSettings {
  stability: number;
  similarityBoost: number;
  style: number;
  speed: number;
  useSpeakerBoost: boolean;
}

export interface CustomVoiceProfile {
  id: string;
  provider: "elevenlabs";
  voiceId: string;
  name: string;
  description: string;
  source: CustomVoiceSource;
  previewUrl?: string;
  labels?: Record<string, string>;
  settings: ElevenLabsVoiceSettings;
  createdAt: string;
  updatedAt: string;
}

export interface VoicePreviewCandidate {
  id: string;
  generatedVoiceId: string;
  audioDataUrl: string;
  mediaType: string;
  durationSecs?: number;
  text?: string;
}

export const DEFAULT_ELEVENLABS_SETTINGS: ElevenLabsVoiceSettings = {
  stability: 0.5,
  similarityBoost: 0.8,
  style: 0.1,
  speed: 1,
  useSpeakerBoost: true,
};
