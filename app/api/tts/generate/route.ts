import { fal } from "@fal-ai/client";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

import {
  countBillableCharacters,
  estimateCharacterCredits,
  estimateFalCostUsd,
} from "@/lib/cost";
import {
  isProviderNotImplemented,
  validateTTSRequest,
  type ValidatedTTSRequest,
  type ValidationIssue,
} from "@/lib/tts-validation";
import type { TTSApiError, TTSGenerateResponse } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_ID = "fal-ai/gemini-3.1-flash-tts";

interface FalAudioFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

interface FalTTSOutput {
  audio?: FalAudioFile;
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  retryable: boolean,
  details?: unknown,
) {
  const body: TTSApiError = {
    error: {
      code,
      message,
      retryable,
      ...(details === undefined ? {} : { details }),
    },
  };

  return NextResponse.json(body, { status });
}

function validationErrorResponse(issues: ValidationIssue[]) {
  return errorResponse(
    400,
    "INVALID_REQUEST",
    "Request validation failed.",
    false,
    { issues },
  );
}

function isFalAudioFile(value: unknown): value is FalAudioFile {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return typeof candidate.url === "string" && candidate.url.length > 0;
}

function isFalTTSOutput(value: unknown): value is FalTTSOutput {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return candidate.audio === undefined || isFalAudioFile(candidate.audio);
}

function isRetryableProviderError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const candidate = error as Record<string, unknown>;
  const status = candidate.status ?? candidate.statusCode;

  if (typeof status === "number") {
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }

  return true;
}

function buildFalInput(request: ValidatedTTSRequest) {
  const input: Record<string, unknown> = {
    prompt: request.prompt,
    output_format: request.output_format,
  };

  if (request.style_instructions) {
    input.style_instructions = request.style_instructions;
  }

  if (request.language_code) {
    input.language_code = request.language_code;
  }

  if (request.temperature !== undefined) {
    input.temperature = request.temperature;
  }

  if (request.mode === "multi") {
    input.speakers = request.speakers;
  } else {
    input.voice = request.voice;
  }

  return input;
}

function filenameExtension(outputFormat: ValidatedTTSRequest["output_format"]) {
  if (outputFormat === "ogg_opus") {
    return "ogg";
  }

  return outputFormat;
}

function slugPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createStudioFileName(request: ValidatedTTSRequest, requestId?: string) {
  const voicePart =
    request.mode === "multi"
      ? request.speakers
          ?.map((speaker) => slugPart(speaker.voice))
          .filter(Boolean)
          .join("-")
      : slugPart(request.voice ?? "voice");
  const uniquePart = slugPart(requestId ?? randomUUID()).slice(0, 10);

  return [
    "threezinc-studio",
    voicePart || "voice",
    uniquePart || "audio",
  ].join("-") + `.${filenameExtension(request.output_format)}`;
}

async function subscribeWithRetry(input: Record<string, unknown>) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await fal.subscribe(MODEL_ID, {
        input,
        logs: true,
        onQueueUpdate(update) {
          if (update.status === "IN_PROGRESS") {
            update.logs.map((log) => log.message).forEach(console.log);
          }
        },
      });
    } catch (error) {
      lastError = error;
      console.error("Fal TTS generation failed", {
        model: MODEL_ID,
        attempt,
        retryable: isRetryableProviderError(error),
        error,
      });

      if (attempt === 2 || !isRetryableProviderError(error)) {
        throw error;
      }
    }
  }

  throw lastError;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return errorResponse(400, "BAD_JSON", "Request body must be valid JSON.", false, {
      cause: error instanceof Error ? error.message : "Unknown JSON parse error",
    });
  }

  const validation = validateTTSRequest(body);
  if (!validation.ok) {
    return validationErrorResponse(validation.issues);
  }

  if (isProviderNotImplemented(validation.value.provider)) {
    return errorResponse(
      501,
      "PROVIDER_NOT_IMPLEMENTED",
      `${validation.value.provider} provider is coming soon.`,
      false,
    );
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return errorResponse(
      503,
      "FAL_KEY_MISSING",
      "FAL_KEY is not configured. Add it to .env.local to enable generation.",
      false,
    );
  }

  fal.config({ credentials: falKey });

  const input = buildFalInput(validation.value);

  try {
    const result = await subscribeWithRetry(input);
    const data: unknown = result.data;

    if (!isFalTTSOutput(data) || !isFalAudioFile(data.audio)) {
      console.error("Fal TTS returned unexpected output", {
        model: MODEL_ID,
        requestId: result.requestId,
        data,
      });

      return errorResponse(
        502,
        "INVALID_PROVIDER_RESPONSE",
        "The provider returned an unexpected audio response.",
        true,
      );
    }

    const characterCount = countBillableCharacters(validation.value.prompt);
    const studioFileName = createStudioFileName(
      validation.value,
      result.requestId,
    );
    const response: TTSGenerateResponse = {
      audio: {
        ...data.audio,
        file_name: studioFileName,
      },
      requestId: result.requestId,
      characterCount,
      estimatedCost: estimateFalCostUsd(characterCount),
      estimatedCredits: estimateCharacterCredits(characterCount),
    };

    return NextResponse.json(response);
  } catch (error) {
    return errorResponse(
      502,
      "PROVIDER_GENERATION_FAILED",
      "Audio generation failed. Please retry.",
      isRetryableProviderError(error),
    );
  }
}
