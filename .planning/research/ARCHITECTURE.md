# Project Research: Architecture

**Project:** ThreeZinc Audio Studio
**Date:** 2026-04-27

## Component Boundaries

### Server Boundary

`app/api/tts/generate/route.ts`

- Owns provider calls.
- Reads `FAL_KEY`.
- Validates request.
- Retries transient failures once.
- Returns structured success/error JSON.
- Does not store scripts, history, or audio files.

### Client App Boundary

`components/tts/`

- Owns user interaction.
- Calls `/api/tts/generate`.
- Plays static previews.
- Plays generated audio.
- Reads/writes browser persistence through `lib/client-store.ts`.

### Config Boundary

`config/`

- `voices.ts`
- `languages.ts`
- `expressive-tags.ts`
- `pricing.ts`
- optional `limits.ts`

Config files are the canonical source for validation, UI options, and estimated cost.

### Hooks Boundary

`hooks/`

- `useAudioManager`
- `useVoicePreview`
- `useTTSGeneration`
- `useLocalStudioStore`
- optional `useAutoResizeTextarea`

Hooks contain reusable behavior. UI components stay focused on rendering.

### Persistence Boundary

`lib/client-store.ts`

- Provides browser storage functions.
- Hides IndexedDB/localStorage choice.
- Stores scripts, settings, and generation metadata only.
- Has no server-side imports.

## Data Flow

### Static Preview Flow

1. Voice card reads `voice.previewUrl`.
2. User presses preview.
3. `useVoicePreview` asks `useAudioManager` to stop any current audio.
4. `useAudioManager` creates/controls an `HTMLAudioElement`.
5. Missing file or playback error updates preview state.

### Generation Flow

1. User edits prompt and settings.
2. Client validates obvious cases and disables invalid generate.
3. `useTTSGeneration` posts typed request to `/api/tts/generate`.
4. API validates again.
5. API calls Fal server-side.
6. API returns audio URL and metadata.
7. Client stores metadata in browser storage.
8. Client shows bottom player.
9. Download action downloads from provider URL.

### Persistence Flow

1. UI updates script/settings state.
2. Debounced save writes to browser storage.
3. On app load, store hydrates saved settings/scripts/history.
4. If browser storage fails, UI remains usable and shows non-blocking storage error.

## Suggested File Structure

```txt
app/
  api/tts/generate/route.ts
  page.tsx
components/
  tts/
    TTSStudio.tsx
    TopBar.tsx
    StudioControls.tsx
    ScriptEditor.tsx
    CostEstimator.tsx
    TagInserter.tsx
    StyleDirector.tsx
    GenerateButton.tsx
    VoiceCatalog.tsx
    VoiceCard.tsx
    AudioPlayer.tsx
    LocalHistoryPanel.tsx
    MultiSpeakerBuilder.tsx
config/
  voices.ts
  languages.ts
  expressive-tags.ts
  pricing.ts
  limits.ts
hooks/
  useAudioManager.ts
  useVoicePreview.ts
  useTTSGeneration.ts
  useLocalStudioStore.ts
lib/
  tts-validation.ts
  client-store.ts
  cost.ts
types/
  tts.ts
public/
  previews/
```

## Build Order Implications

- Types/config/validation must come before API and UI.
- Preview assets/config must come before voice cards.
- Audio manager must come before preview and generated player.
- Browser store can be implemented after basic generation but before Phase 2 completion.
- Multi-speaker should wait until single-speaker path is stable.

## Architecture Decision

Keep V1 deliberately boring. The main quality comes from correct boundaries and fast UX, not from abstraction depth.
