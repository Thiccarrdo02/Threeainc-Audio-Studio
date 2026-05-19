// Maps provider error codes to user-friendly copy. Keep messages short, actionable,
// and free of technical jargon. The raw error code is kept as a small caption so
// power users can search support if needed.

export interface FriendlyError {
  title: string;
  detail: string;
  retryable: boolean;
}

const ERROR_COPY: Record<string, { title: string; detail: string }> = {
  INVALID_REQUEST: {
    title: "Something's off in your script settings",
    detail: "Please review the highlighted fields and try again.",
  },
  BAD_JSON: {
    title: "We couldn't read that request",
    detail: "Refresh the page and try generating again.",
  },
  PROVIDER_NOT_IMPLEMENTED: {
    title: "This provider isn't available yet",
    detail: "Switch to a built-in or custom voice to generate audio.",
  },
  FAL_KEY_MISSING: {
    title: "Generation is not configured",
    detail: "Add FAL_KEY to your .env.local file to enable generation.",
  },
  PROVIDER_GENERATION_FAILED: {
    title: "Audio generation failed",
    detail: "The voice provider couldn't finish this request. Try again in a moment.",
  },
  INVALID_PROVIDER_RESPONSE: {
    title: "The provider returned an unexpected response",
    detail: "Please regenerate. If this keeps happening, try a shorter script.",
  },
  CUSTOM_VOICE_SPEECH_FAILED: {
    title: "Couldn't speak with that custom voice",
    detail: "The voice provider rejected the request. Try a shorter script or another voice.",
  },
  CUSTOM_VOICE_NOT_FOUND: {
    title: "Custom voice not found",
    detail: "It may have been deleted. Pick another voice from your library.",
  },
  NETWORK_ERROR: {
    title: "Couldn't reach the studio",
    detail: "Check your connection and try again.",
  },
  UNKNOWN_ERROR: {
    title: "Something went wrong",
    detail: "Please try again. If it persists, reload the page.",
  },
  QUOTA_EXCEEDED: {
    title: "Local storage is full",
    detail: "Clear some saved generations or scripts to keep persisting new ones.",
  },
};

export function friendlyError(input: {
  code?: string;
  message?: string;
  retryable?: boolean;
}): FriendlyError {
  const code = input.code ?? "UNKNOWN_ERROR";
  const copy = ERROR_COPY[code] ?? ERROR_COPY.UNKNOWN_ERROR;

  // If the provider gave us a non-generic, short message, prefer it as the detail
  // (truncated) so users get specific context.
  const provided = input.message?.trim();
  const detail =
    provided && provided.length > 0 && provided.length < 240
      ? provided
      : copy.detail;

  return {
    title: copy.title,
    detail,
    retryable: input.retryable ?? true,
  };
}
