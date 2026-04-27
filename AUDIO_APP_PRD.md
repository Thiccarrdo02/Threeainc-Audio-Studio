# ThreeZinc Audio Studio PRD

## 1. Product Summary

Build a standalone local-first Text-to-Speech studio for ThreeZinc that lets users write scripts, choose Gemini TTS voices, preview voices instantly, generate polished speech audio, download results, and prepare multi-speaker dialogue. The first version must run locally on a developer PC with browser-stored scripts, browser-stored metadata, and static local preview audio. It must be production-quality enough to merge later into the existing ThreeZinc app, but it must not depend on the ThreeZinc production database or storage system yet.

The core product should feel like a premium creator tool: dense, fast, controlled, and clearly branded as ThreeZinc. The app should expose Gemini's expressive audio tags and multi-speaker capabilities as first-class UX instead of hiding them in documentation.

## 2. Sources Reviewed

- Local implementation prompt: `Audio.md`
- Local design system: `threezinc_design_system (1).md`
- Fal model docs: https://fal.ai/models/fal-ai/gemini-3.1-flash-tts/api
- Gemini speech generation docs: https://ai.google.dev/gemini-api/docs/speech-generation
- Gemini API pricing docs: https://ai.google.dev/gemini-api/docs/pricing
- Google Cloud Gemini-TTS voice demos: https://docs.cloud.google.com/text-to-speech/docs/gemini-tts

## 3. Goals

- Create a standalone Next.js app that works locally from end to end.
- Generate single-speaker speech through the server only, using `@fal-ai/client`.
- Provide instant voice previews from static files in `public/previews/`.
- Support browser script/history storage with an adapter that can later be swapped for ThreeZinc's database.
- Use ThreeZinc visual language: Inter, Maven Pro accents, vibrant blue/cyan gradients, 8px radius, dark-mode-ready surfaces.
- Implement in phases with validation after each phase.
- Keep the first working release focused: 5 voices, 2 languages plus auto-detect, then expand to all supported voices/languages.

## 4. Non-Goals For V1

- No production ThreeZinc database integration.
- No cloud storage integration beyond the provider-generated audio URL.
- No user accounts, teams, billing, or quotas.
- No voice cloning implementation, but leave a provider extension point.
- No live preview generation via API.
- No streaming TTS; Gemini TTS docs state TTS does not support streaming.

## 5. Target User

The primary user is a ThreeZinc creator/operator who wants to quickly turn scripts into high-quality voice audio for videos, product demos, training, ads, reels, explainers, podcasts, and internal content. They need fast auditioning, clear cost visibility, script control, and reliable downloads.

## 6. MVP Scope

### Phase 1: Core Backend

Build the server-side generation foundation.

- Next.js App Router API route: `POST /api/tts/generate`
- Uses `@fal-ai/client`, never client-side provider calls.
- Requires `FAL_KEY` in `.env.local`.
- Supports:
  - `prompt`
  - `style_instructions`
  - `voice`
  - `language_code`
  - `speakers`
  - `mode: "single" | "multi"`
  - `provider?: "gemini" | "clone" | "openai"`
  - `output_format: "mp3"` default
- Validates prompt presence, prompt length, voice IDs, language codes, and speaker aliases.
- If `fal.subscribe` fails, log the full server-side error, retry once, and return a structured JSON error.
- For `provider === "clone"` or `"openai"`, return `501` with a structured "coming soon" error.

Validation gate:

- Call `/api/tts/generate` with a sample single-speaker prompt.
- Confirm a valid audio object or URL is returned.
- Confirm bad input returns structured errors.
- Do not proceed to Phase 2 until this works.

### Phase 2: UI MVP

Build the usable local studio.

- Script editor textarea.
- Voice selector for 5 starting voices:
  - Kore
  - Puck
  - Charon
  - Zephyr
  - Aoede
- Language selector for:
  - Auto-detect
  - English (US)
  - Hindi (India)
- Style instructions input.
- Expressive tag inserter.
- Generate button with loading/error states.
- Audio player with play/pause, seek, duration, volume, download, regenerate.
- Static voice previews with immediate playback.
- Browser persistence for scripts, settings, and generation metadata.

Validation gate:

- Generate audio from a sample prompt in the browser.
- Preview each of the 5 voices without calling `/api/tts/generate`.
- Confirm only one preview/result audio plays at a time.
- Confirm download works.
- Confirm page works on desktop and mobile widths.

### Phase 3: Advanced UX

Expand the product once the MVP is stable.

- Add all 30 Gemini voice cards.
- Add voice search, gender filter, tone filters.
- Add exactly-2-speaker builder.
- Add all priority languages, then the full supported language list.
- Add saved scripts/history panel.
- Add waveform visualization.
- Add polished Framer Motion transitions.
- Add accessibility refinements and keyboard shortcuts.

Validation gate:

- Test single-speaker flow end to end.
- Test multi-speaker flow end to end.
- Test static preview playback for every voice.
- Test local history save/load/delete.
- Run lint/typecheck/build.

## 7. Agent Behavior Rules

DO NOT:

- Skip phases.
- Assume APIs without testing.
- Continue to the next phase if validation fails.
- Expose `FAL_KEY` in client code.
- Generate voice previews dynamically.
- Use in-memory API route cache for previews.
- Add SQLite, filesystem audio storage, or server-side persistence in V1.
- Mutate React state directly.
- Allow two audio sources to play at the same time.

ALWAYS:

- Test each phase before continuing.
- Log server errors clearly.
- Return structured API errors.
- Retry provider generation once for transient Fal/Gemini failures.
- Ask for clarification only if blocked by missing secrets, missing tooling, or contradictory requirements.
- Keep local-first architecture easy to merge into ThreeZinc later.

## 8. Technical Architecture

### Stack

- Framework: Next.js 14+ App Router
- Language: TypeScript strict mode
- Styling: Tailwind CSS
- UI: shadcn/ui where useful
- Icons: lucide-react
- Animation: Framer Motion
- TTS provider: Fal `fal-ai/gemini-3.1-flash-tts`
- SDK: `@fal-ai/client`
- Audio: native `HTMLAudioElement`
- Local storage:
  - V1 must use browser storage only: IndexedDB preferred, localStorage acceptable for a minimal first pass.
  - Do not use SQLite in V1.
  - Do not write generated audio files to local disk in V1.
  - Wrap persistence in `lib/client-store.ts` so it can later be replaced by API/database storage in the ThreeZinc merge.

### Provider Notes

Fal docs confirm the model supports expressive tags, `style_instructions`, 30 voices, language selection, multi-speaker configuration, `temperature`, and `output_format`. Fal also warns to protect `FAL_KEY` and use a server-side proxy for browser apps.

Google docs confirm Gemini TTS supports single-speaker and multi-speaker audio, natural-language control for style/accent/pace/tone, and inline audio tags. Google docs also note there is no exhaustive tag list, non-English transcripts should still use English audio tags, TTS does not stream, long outputs can drift, and occasional retries are needed because the model may sometimes return non-audio tokens.

Pricing in V1 is a fixed UI estimate. Add `COST_PER_1K_CHARS = 0.15` in config and display it as "Estimated cost". Do not implement token pricing in V1, and do not hard-code pricing deep in components.

## 9. Static Voice Preview Requirement

Voice previews must be static local assets.

Do not build `app/api/tts/preview/route.ts`.
Do not fetch preview audio from external URLs at runtime.
Do not scrape preview MP3/WAV files at runtime.

Implementation requirement:

- Create `public/previews/`.
- Add a `previewUrl` field to each voice config.
- Implement `useVoicePreview` so it plays `voice.previewUrl` directly.
- Preload only the active/hovered preview, not all previews at once.
- If a preview file is missing, show a clear disabled/error state on the voice card.
- MVP preview format: WAV is acceptable and preferred because the researched Google demo assets are WAV.
- Generated audio format: request provider `mp3` by default.

Preview source priority:

1. Long-term owned previews generated once via an official API and committed/served locally.
2. Temporary local seed previews downloaded once from official Google demo assets for local testing.
3. Never use runtime external preview URLs.

Research-backed source:

Google Cloud's Gemini-TTS docs expose static demo audio paths such as:

- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-kore.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-puck.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-charon.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-zephyr.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-aoeda.wav`

The implementation agent should download these locally and rename them consistently, for example:

- `public/previews/Kore.wav`
- `public/previews/Puck.wav`
- `public/previews/Charon.wav`
- `public/previews/Zephyr.wav`
- `public/previews/Aoede.wav`

Note: the Google path for Aoede currently appears as `aoeda`, so the download script must map that source filename to the app's `Aoede` voice ID. Keep these as local-only seed assets until replaced with owned previews.

## 10. Core User Flow

1. User opens local ThreeZinc Audio Studio.
2. User writes or loads a local script.
3. User selects language.
4. User auditions voices instantly from local preview files.
5. User inserts expressive tags as needed.
6. User adds optional style instructions.
7. User clicks Generate.
8. Server calls Fal and returns an audio result.
9. User plays, seeks, downloads, regenerates, or saves metadata locally.
10. User can later reopen local history and reuse scripts/settings.

## 11. UI Requirements

### Layout

- Full-page app, not a landing page.
- Desktop: two-column layout.
  - Left: script and generation controls.
  - Right: voice catalog.
- Mobile: single-column stacked layout.
- Sticky top bar:
  - Product name: `Audio Studio`
  - Mode toggle: Single Voice / Multi-Speaker
  - Character counter
- Sticky bottom audio player appears only after generation.

### Component Tree

- `TTSStudio`
  - `TopBar`
  - `StudioControls`
    - `LanguageSelector`
    - `ScriptEditor`
      - `CostEstimator`
      - `TagInserter`
    - `StyleDirector`
    - `GenerateButton`
  - `VoiceCatalog`
    - `VoiceCard`
    - `MultiSpeakerBuilder` when mode is multi
  - `AudioPlayer`
  - `LocalHistoryPanel`

Important composition rule:

Render `TagInserter` and `CostEstimator` directly underneath the textarea inside `ScriptEditor`, not as siblings in `StudioControls`.

### ThreeZinc Design Direction

Use the local design system rather than the violet-heavy palette in `Audio.md`.

- Primary: `#3353FE`
- Primary hover: `#1F4CEE`
- Accent: `#32B7EE`
- Accent hover: `#41A7FE`
- Gradient: `#1F4CEE` to `#41A7FE` to `#32B7EE`
- Base font: Inter
- Heading/accent font: Maven Pro
- Base body size: 13px
- Border radius: 8px for cards and major surfaces, 6px medium, 4px compact controls
- Dark surface: `hsl(0 0% 3.9%)`
- Light surface: white

The UI should feel like a ThreeZinc work tool: compact, crisp, brand-blue, high-contrast, and practical. Avoid a marketing hero, oversized decorative cards, purple-dominant gradients, and nested cards.

## 12. Data Model

### Voice

```ts
interface Voice {
  id: string;
  displayName: string;
  gender: "Male" | "Female";
  accent?: string;
  description: string;
  tones: string[];
  previewText: string;
  previewUrl: string;
  enabledInMvp: boolean;
}
```

### Script

```ts
interface LocalScript {
  id: string;
  title: string;
  prompt: string;
  styleInstructions: string;
  mode: "single" | "multi";
  voiceId?: string;
  speakers?: Speaker[];
  languageCode?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Generation

```ts
interface LocalGeneration {
  id: string;
  scriptId?: string;
  prompt: string;
  styleInstructions?: string;
  mode: "single" | "multi";
  voiceId?: string;
  speakers?: Speaker[];
  languageCode?: string;
  provider: "gemini";
  audioUrl: string;
  fileName?: string;
  fileSize?: number;
  characterCount: number;
  estimatedCost: number;
  createdAt: string;
}
```

## 13. Multi-Speaker Requirements

V1 may ship single-speaker first, but the architecture must support multi-speaker.

- MVP multi-speaker mode supports exactly 2 speakers.
- Do not expose add/remove speaker controls in V1.
- A future release may expand speaker count only after provider behavior is tested and confirmed.
- Speaker aliases must be alphanumeric and match prompt prefixes exactly.
- Switching from single to multi must not clear `prompt`.
- If switching to multi and the prompt has no speaker prefixes, preserve the text and prepend a small editable template or transform into:

```txt
Speaker1: <existing text>
Speaker2:
```

- Switching back to single must preserve prompt text.

## 14. Expressive Tags

Use one canonical MVP tag set in both config and UI:

- `[laughing]`
- `[sigh]`
- `[whispering]`
- `[excited]`
- `[slowly]`
- `[fast]`
- `[short pause]`
- `[dramatic]`
- `[cheerfully]`

Google recommends experimentation because there is no exhaustive supported list. If transcript language is not English, keep tags in English.

## 15. API Contract

### Request

```ts
interface TTSGenerateRequest {
  prompt: string;
  style_instructions?: string;
  voice?: string;
  language_code?: string;
  speakers?: Speaker[];
  mode: "single" | "multi";
  provider?: "gemini" | "clone" | "openai";
  output_format?: "mp3" | "wav" | "ogg_opus";
}
```

### Success Response

```ts
interface TTSGenerateResponse {
  audio: {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
  };
  requestId?: string;
  characterCount: number;
  estimatedCost: number;
}
```

### Error Response

```ts
interface TTSApiError {
  error: {
    code: string;
    message: string;
    retryable: boolean;
    details?: unknown;
  };
}
```

## 16. Local Persistence

V1 is a local browser tool, not a server-side local database product. Persist locally in the browser only:

- Scripts
- Last selected voice/language/style
- Generation history metadata

Generated audio source of truth:

- Store only the provider `audio.url` and metadata.
- Do not download generated audio into `data/generated/` in V1.
- The download button downloads directly from `audio.url`.
- If the provider URL expires in the future, show a clear stale-link state and allow regeneration.

Recommended browser storage:

```txt
IndexedDB:
  scripts
  generations
  settings

localStorage:
  acceptable fallback for MVP settings and small script/history data
```

Storage must be wrapped behind a small client-side repository/service layer, for example `lib/client-store.ts`, so it can later be replaced by the ThreeZinc database/storage layer.

Empty states:

- No script: show an empty editor with a helpful placeholder and disabled generate button.
- No history: show a compact empty state in the history panel.
- Missing preview file: disable the preview button for that voice and show a tooltip/error state.
- No generation yet: hide the bottom audio player.

## 17. Acceptance Criteria

- App runs locally with `npm run dev`.
- `/api/tts/generate` returns audio for a valid single-speaker request.
- API rejects invalid requests with structured JSON.
- Preview playback is instant and uses files from `public/previews/`.
- Preview starts in under 100ms after the local asset is available to the browser.
- No preview API route exists.
- `FAL_KEY` is never exposed client-side.
- Script editor preserves content across mode switches.
- Generated audio can be played and downloaded.
- Generated audio is stored as URL + metadata only.
- Local scripts/history persist after browser refresh.
- Only one audio source can play at a time.
- Prompt longer than 3,000 characters shows a warning: "Long scripts may reduce quality. Consider splitting."
- Failed generations show retry controls and mark errors as retryable or non-retryable.
- UI uses ThreeZinc colors, typography, and radius.
- Mobile layout is usable without overlapping controls.
- Browser console has no app errors during happy-path preview, generate, playback, download, and history flows.
- TypeScript strict mode passes.
- Lint/build pass.

## 18. Implementation Order

1. Create project scaffold and install dependencies.
2. Add ThreeZinc theme tokens.
3. Add config files for MVP voices, languages, tags, pricing.
4. Download static preview audio for MVP voices.
5. Build `/api/tts/generate`.
6. Validate backend with a sample request.
7. Build browser persistence adapter.
8. Build core UI MVP.
9. Validate generation, playback, preview, download, persistence.
10. Expand voices/languages after MVP works.
11. Add exactly-2-speaker UI and validate provider behavior.
12. Polish accessibility, responsiveness, animations, and error states.

## 19. Risks And Mitigations

- Provider schema drift: verify Fal docs before implementation and keep provider mapping isolated.
- Preview asset licensing/availability: download static Google demo files for local development; document source and replace with owned assets later if needed.
- Long output quality drift: warn users for long scripts and recommend chunking.
- Random TTS failures: retry once and show retryable errors.
- Pricing mismatch: use `COST_PER_1K_CHARS = 0.15` in config and label as estimate.
- Multi-speaker ambiguity: MVP supports exactly 2 speakers.
- Future ThreeZinc merge complexity: keep app routes/components/storage separated and avoid hard-coding local paths in UI components.

## 20. Definition Of Done

The app is considered ready for local production testing when a user can open it locally, preview voices instantly from local files, create or load a script, generate speech, play the output, download directly from the provider URL, refresh the browser, and recover local scripts/history without using SQLite, filesystem audio storage, or the future ThreeZinc production database/storage stack.

V1 is a local tool. V2 is the productized ThreeZinc integration.
