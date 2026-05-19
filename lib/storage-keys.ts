/**
 * Versioned-localStorage helpers. Bumping a key's version forces a fresh read
 * (or runs a migration if registered) and keeps every consumer in sync —
 * nothing should hard-code "threezinc-audio.foo.v1".
 */

export const STORAGE_SCHEMA = {
  settings: { key: "threezinc-audio.settings", version: 1 },
  scripts: { key: "threezinc-audio.scripts", version: 1 },
  generations: { key: "threezinc-audio.generations", version: 1 },
  customVoices: { key: "threezinc-audio.custom-voices", version: 1 },
} as const;

export type StorageSchemaKey = keyof typeof STORAGE_SCHEMA;

export function storageKey(name: StorageSchemaKey): string {
  const entry = STORAGE_SCHEMA[name];
  return `${entry.key}.v${entry.version}`;
}

/**
 * One-shot migration helper. Iterates older versions of a key, reads their
 * value, and removes them. Returns the most recent legacy value, if any —
 * callers can fold it into the current shape.
 */
export function migrateLegacyKeys<T>(
  name: StorageSchemaKey,
  parse: (raw: string) => T | null,
): T | null {
  if (typeof window === "undefined") return null;
  const entry = STORAGE_SCHEMA[name];
  let mostRecent: T | null = null;
  for (let v = entry.version - 1; v >= 1; v -= 1) {
    const legacyKey = `${entry.key}.v${v}`;
    const raw = window.localStorage.getItem(legacyKey);
    if (raw) {
      try {
        const parsed = parse(raw);
        if (parsed !== null && mostRecent === null) {
          mostRecent = parsed;
        }
      } catch {
        // Ignore parse errors — legacy data is gone after this.
      }
      window.localStorage.removeItem(legacyKey);
    }
  }
  return mostRecent;
}
