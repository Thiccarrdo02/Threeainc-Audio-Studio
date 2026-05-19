import { fal } from "@fal-ai/client";
import { randomUUID } from "node:crypto";

import {
  countBillableCharacters,
  estimateCharacterCredits,
  estimateFalCostUsd,
} from "@/lib/cost";
import {
  getErrorMessage,
  isRetryableProviderError,
  isTimeoutError,
  jsonError,
  withTimeout,
} from "@/lib/api-utils";
import { logger, withRequestLogging } from "@/lib/logger";
import {
  isProviderNotImplemented,
  validateTTSRequest,
  type ValidatedTTSRequest,
  type ValidationIssue,
} from "@/lib/tts-validation";
import type { TTSGenerateResponse } from "@/types/tts";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL_ID = "fal-ai/gemini-3.1-flash-tts";
// Leave a few seconds of headroom under maxDuration so the response can flush.
const FAL_TIMEOUT_MS = 55_000;

interface FalAudioFile {
  url: string;
  content_type?: string;
  file_name?: string;
  file_size?: number;
}

interface FalTTSOutput {
  audio?: FalAudioFile;
}

function validationErrorResponse(issues: ValidationIssue[]) {
  return jsonError({
    status: 400,
    code: "INVALID_REQUEST",
    message: "Request validation failed.",
    retryable: false,
    details: { issues },
  });
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
  if (outputFormat === "ogg_opus") return "ogg";
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
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fal.subscribe(MODEL_ID, {
        input,
        logs: true,
      });
    } catch (error) {
      lastError = error;
      const retryable = isRetryableProviderError(error);
      logger.warn("fal.subscribe.failed", {
        model: MODEL_ID,
        attempt,
        retryable,
      });
      // Only retry transient failures (5xx, 408, 429, network-level errors
      // with no status). Permanent 4xx errors fail fast — retrying would just
      // burn latency and money.
      if (attempt === MAX_ATTEMPTS || !retryable) {
        throw error;
      }
    }
  }

  throw lastError;
}

async function handlePost(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    return jsonError({
      status: 400,
      code: "BAD_JSON",
      message: "Request body must be valid JSON.",
      retryable: false,
      details: {
        cause: error instanceof Error ? error.message : "Unknown JSON parse error",
      },
    });
  }

  const validation = validateTTSRequest(body);
  if (!validation.ok) {
    return validationErrorResponse(validation.issues);
  }

  if (isProviderNotImplemented(validation.value.provider)) {
    return jsonError({
      status: 501,
      code: "PROVIDER_NOT_IMPLEMENTED",
      message: `${validation.value.provider} provider is coming soon.`,
      retryable: false,
    });
  }

  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    return jsonError({
      status: 503,
      code: "FAL_KEY_MISSING",
      message: "FAL_KEY is not configured. Add it to .env.local to enable generation.",
      retryable: false,
    });
  }

  fal.config({ credentials: falKey });

  const input = buildFalInput(validation.value);

  try {
    const result = await withTimeout(
      async () => subscribeWithRetry(input),
      FAL_TIMEOUT_MS,
    );
    const data: unknown = result.data;

    if (!isFalTTSOutput(data) || !isFalAudioFile(data.audio)) {
      logger.error("fal.invalid_output", {
        model: MODEL_ID,
        requestId: result.requestId,
      });

      return jsonError({
        status: 502,
        code: "INVALID_PROVIDER_RESPONSE",
        message: "The provider returned an unexpected audio response.",
        retryable: true,
      });
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

    return Response.json(response);
  } catch (error) {
    if (isTimeoutError(error)) {
      logger.warn("fal.timeout", { model: MODEL_ID, timeoutMs: FAL_TIMEOUT_MS });
      return jsonError({
        status: 504,
        code: "PROVIDER_TIMEOUT",
        message:
          "Generation took longer than expected. Try a shorter script or generate again.",
        retryable: true,
      });
    }

    const providerMessage = getErrorMessage(error, "Unknown provider error.");
    return jsonError({
      status: 502,
      code: "PROVIDER_GENERATION_FAILED",
      message: `Audio generation failed: ${providerMessage}`,
      retryable: isRetryableProviderError(error),
      details: { provider: "fal", model: MODEL_ID },
    });
  }
}

export const POST = withRequestLogging(handlePost, "POST /api/tts/generate");
