export type TTSMode = "single" | "multi";
export type TTSProvider = "gemini" | "clone" | "openai";
export type TTSOutputFormat = "mp3" | "wav" | "ogg_opus";
export type VoiceGender = "Male" | "Female";

export interface Speaker {
  speaker_id: string;
  voice: string;
}

export interface Voice {
  id: string;
  displayName: string;
  gender: VoiceGender;
  accent?: string;
  description: string;
  tones: string[];
  previewText: string;
  previewUrl: string;
  previewUrls: {
    english: string;
    hindi: string;
  };
  enabledInMvp: boolean;
}

export interface LanguageOption {
  id: string;
  label: string;
  providerValue?: string;
  region?: "India" | "Global" | "Americas" | "Europe" | "Asia" | "Africa";
  featured?: boolean;
}

export interface TTSGenerateRequest {
  prompt: string;
  style_instructions?: string;
  voice?: string;
  language_code?: string;
  speakers?: Speaker[];
  mode: TTSMode;
  provider?: TTSProvider;
  output_format?: TTSOutputFormat;
  temperature?: number;
}

export interface TTSGenerateResponse {
  audio: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  requestId?: string;
  characterCount: number;
  estimatedCost: number;
  estimatedCredits: number;
}

export interface TTSApiError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
}

export interface LocalScript {
  id: string;
  title: string;
  prompt: string;
  styleInstructions: string;
  mode: TTSMode;
  voiceId?: string;
  speakers?: Speaker[];
  languageCode?: string;
  outputFormat?: TTSOutputFormat;
  temperature?: number;
  accentPreset?: string;
  accentStrength?: number;
  tonePreset?: string;
  pacePreset?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocalGeneration {
  id: string;
  scriptId?: string;
  prompt: string;
  styleInstructions?: string;
  mode: TTSMode;
  voiceId?: string;
  speakers?: Speaker[];
  languageCode?: string;
  outputFormat?: TTSOutputFormat;
  temperature?: number;
  provider: "gemini";
  audioUrl: string;
  fileName?: string;
  fileSize?: number;
  characterCount: number;
  estimatedCost: number;
  estimatedCredits: number;
  createdAt: string;
}

export interface StudioState {
  mode: TTSMode;
  prompt: string;
  styleInstructions: string;
  voiceId: string;
  languageCode: string;
  speakers: Speaker[];
  outputFormat: TTSOutputFormat;
  temperature: number;
  accentPreset: string;
  accentStrength: number;
  tonePreset: string;
  pacePreset: string;
}
