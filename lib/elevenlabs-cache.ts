import {
  getCustomVoiceSubscription,
  type CustomVoiceSubscription,
} from "@/lib/elevenlabs";

interface CacheEntry {
  expiresAt: number;
  value: CustomVoiceSubscription;
}

const TTL_MS = 60 * 60 * 1000; // 1 hour — subscription state changes rarely

let cached: CacheEntry | undefined;

/**
 * Returns the cached subscription if it's still fresh; otherwise fetches and
 * caches it. Failures fall through (the caller decides retry semantics) but
 * never poison the cache.
 */
export async function getCachedCustomVoiceSubscription(options?: {
  forceRefresh?: boolean;
}): Promise<CustomVoiceSubscription> {
  if (
    !options?.forceRefresh &&
    cached &&
    cached.expiresAt > Date.now()
  ) {
    return cached.value;
  }

  const value = await getCustomVoiceSubscription();
  cached = { value, expiresAt: Date.now() + TTL_MS };
  return value;
}

export function clearCustomVoiceSubscriptionCache() {
  cached = undefined;
}
