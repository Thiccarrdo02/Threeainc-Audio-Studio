import { MAX_PROMPT_CHARACTERS } from "@/config/limits";
import { isLanguageSupported, toProviderLanguageCode } from "@/config/languages";
import { isMvpVoiceId } from "@/config/voices";
import type {
  Speaker,
  TTSMode,
  TTSOutputFormat,
  TTSProvider,
} from "@/types/tts";

export interface ValidationIssue {
  field: string;
  code: string;
  message: string;
}

export interface ValidatedTTSRequest {
  prompt: string;
  style_instructions?: string;
  voice?: string;
  language_code?: string;
  speakers?: Speaker[];
  mode: TTSMode;
  provider: TTSProvider;
  output_format: TTSOutputFormat;
  temperature?: number;
}

export type ValidationResult =
  | { ok: true; value: ValidatedTTSRequest }
  | { ok: false; issues: ValidationIssue[] };

const OUTPUT_FORMATS = ["mp3", "wav", "ogg_opus"] as const;
const MODES = ["single", "multi"] as const;
const PROVIDERS = ["gemini", "clone", "openai"] as const;
const SPEAKER_ALIAS_PATTERN = /^[A-Za-z0-9]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isMode(value: unknown): value is TTSMode {
  return isString(value) && MODES.includes(value as TTSMode);
}

function isProvider(value: unknown): value is TTSProvider {
  return isString(value) && PROVIDERS.includes(value as TTSProvider);
}

function isOutputFormat(value: unknown): value is TTSOutputFormat {
  return isString(value) && OUTPUT_FORMATS.includes(value as TTSOutputFormat);
}

function validateSpeaker(value: unknown, index: number): Speaker | ValidationIssue[] {
  if (!isRecord(value)) {
    return [
      {
        field: `speakers.${index}`,
        code: "INVALID_SPEAKER",
        message: "Speaker must be an object.",
      },
    ];
  }

  const issues: ValidationIssue[] = [];
  const rawSpeakerId = value.speaker_id;
  const rawVoice = value.voice;

  if (!isString(rawSpeakerId) || rawSpeakerId.trim().length === 0) {
    issues.push({
      field: `speakers.${index}.speaker_id`,
      code: "INVALID_SPEAKER_ID",
      message: "Speaker alias is required.",
    });
  } else if (!SPEAKER_ALIAS_PATTERN.test(rawSpeakerId)) {
    issues.push({
      field: `speakers.${index}.speaker_id`,
      code: "INVALID_SPEAKER_ID",
      message: "Speaker alias must be alphanumeric with no whitespace.",
    });
  }

  if (!isString(rawVoice) || !isMvpVoiceId(rawVoice)) {
    issues.push({
      field: `speakers.${index}.voice`,
      code: "INVALID_VOICE",
      message: "Speaker voice must be one of the configured Fal/Gemini voices.",
    });
  }

  if (issues.length > 0) {
    return issues;
  }

  const speakerId = typeof rawSpeakerId === "string" ? rawSpeakerId.trim() : "";
  const voice = typeof rawVoice === "string" ? rawVoice : "";

  return {
    speaker_id: speakerId,
    voice,
  };
}

function validateSpeakers(value: unknown): Speaker[] | ValidationIssue[] {
  if (!Array.isArray(value)) {
    return [
      {
        field: "speakers",
        code: "INVALID_SPEAKERS",
        message: "Multi-speaker mode requires exactly two speakers.",
      },
    ];
  }

  if (value.length !== 2) {
    return [
      {
        field: "speakers",
        code: "INVALID_SPEAKER_COUNT",
        message: "Multi-speaker mode supports exactly two speakers.",
      },
    ];
  }

  const speakers: Speaker[] = [];
  const issues: ValidationIssue[] = [];

  value.forEach((speaker, index) => {
    const result = validateSpeaker(speaker, index);
    if (Array.isArray(result)) {
      issues.push(...result);
    } else {
      speakers.push(result);
    }
  });

  const aliases = new Set(speakers.map((speaker) => speaker.speaker_id));
  if (speakers.length === 2 && aliases.size !== 2) {
    issues.push({
      field: "speakers",
      code: "DUPLICATE_SPEAKER_ID",
      message: "Speaker aliases must be unique.",
    });
  }

  return issues.length > 0 ? issues : speakers;
}

export function validateTTSRequest(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return {
      ok: false,
      issues: [
        {
          field: "body",
          code: "INVALID_REQUEST",
          message: "Request body must be a JSON object.",
        },
      ],
    };
  }

  const issues: ValidationIssue[] = [];
  const prompt = input.prompt;
  const styleInstructions = input.style_instructions;
  const mode = input.mode;
  const provider = input.provider ?? "gemini";
  const outputFormat = input.output_format ?? "mp3";
  const voice = input.voice ?? "Kore";
  const languageCode = input.language_code;
  const temperature = input.temperature;

  if (!isString(prompt) || prompt.trim().length === 0) {
    issues.push({
      field: "prompt",
      code: "PROMPT_REQUIRED",
      message: "Prompt is required.",
    });
  } else if (prompt.trim().length > MAX_PROMPT_CHARACTERS) {
    issues.push({
      field: "prompt",
      code: "PROMPT_TOO_LONG",
      message: `Prompt must be ${MAX_PROMPT_CHARACTERS} characters or fewer.`,
    });
  }

  if (styleInstructions !== undefined && !isString(styleInstructions)) {
    issues.push({
      field: "style_instructions",
      code: "INVALID_STYLE_INSTRUCTIONS",
      message: "Style instructions must be text.",
    });
  }

  if (!isMode(mode)) {
    issues.push({
      field: "mode",
      code: "INVALID_MODE",
      message: "Mode must be single or multi.",
    });
  }

  if (!isProvider(provider)) {
    issues.push({
      field: "provider",
      code: "INVALID_PROVIDER",
      message: "Provider must be gemini, clone, or openai.",
    });
  }

  if (!isOutputFormat(outputFormat)) {
    issues.push({
      field: "output_format",
      code: "INVALID_OUTPUT_FORMAT",
      message: "Output format must be mp3, wav, or ogg_opus.",
    });
  }

  if (
    temperature !== undefined &&
    (typeof temperature !== "number" ||
      !Number.isFinite(temperature) ||
      temperature < 0 ||
      temperature > 2)
  ) {
    issues.push({
      field: "temperature",
      code: "INVALID_TEMPERATURE",
      message: "Temperature must be a number between 0 and 2.",
    });
  }

  if (languageCode !== undefined) {
    if (!isString(languageCode) || !isLanguageSupported(languageCode)) {
      issues.push({
        field: "language_code",
        code: "INVALID_LANGUAGE",
        message: "Language is not supported by the current Fal/Gemini TTS model.",
      });
    }
  }

  let speakers: Speaker[] | undefined;
  if (mode === "multi") {
    const speakerResult = validateSpeakers(input.speakers);
    if (Array.isArray(speakerResult) && speakerResult.some((item) => "field" in item)) {
      issues.push(...(speakerResult as ValidationIssue[]));
    } else {
      speakers = speakerResult as Speaker[];
    }
  } else if (mode === "single") {
    if (!isString(voice) || !isMvpVoiceId(voice)) {
      issues.push({
        field: "voice",
        code: "INVALID_VOICE",
        message: "Voice must be one of the configured Fal/Gemini voices.",
      });
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const validated: ValidatedTTSRequest = {
    prompt: (prompt as string).trim(),
    mode: mode as TTSMode,
    provider: provider as TTSProvider,
    output_format: outputFormat as TTSOutputFormat,
  };

  if (styleInstructions) {
    validated.style_instructions = (styleInstructions as string).trim();
  }

  if (typeof temperature === "number") {
    validated.temperature = temperature;
  }

  const providerLanguageCode = toProviderLanguageCode(languageCode as string | undefined);
  if (providerLanguageCode) {
    validated.language_code = providerLanguageCode;
  }

  if (validated.mode === "multi") {
    validated.speakers = speakers;
  } else {
    validated.voice = voice as string;
  }

  return { ok: true, value: validated };
}

export function isProviderNotImplemented(provider: TTSProvider): boolean {
  return provider === "clone" || provider === "openai";
}
