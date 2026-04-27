# Requirements: ThreeZinc Audio Studio

**Defined:** 2026-04-27
**Core Value:** A user can locally turn a script into downloadable speech audio with fast voice auditioning and no dependency on ThreeZinc production storage.

## v1 Requirements

### Project Foundation

- [ ] **FOUND-01**: Developer can run the standalone app locally with `npm run dev`.
- [ ] **FOUND-02**: Project uses Next.js App Router, TypeScript strict mode, Tailwind CSS, shadcn/ui where useful, lucide-react, and Framer Motion.
- [ ] **FOUND-03**: Project includes `.env.example` documenting `FAL_KEY` without committing secrets.
- [ ] **FOUND-04**: Project exposes app code in clean local-first boundaries that can later be merged into the ThreeZinc app.
- [ ] **FOUND-05**: Lint, typecheck, and production build commands exist and pass before implementation is considered done.

### Provider API

- [ ] **API-01**: User can send a valid single-speaker request to `POST /api/tts/generate` and receive an audio response.
- [ ] **API-02**: API route calls Fal server-side using `@fal-ai/client` and never exposes `FAL_KEY` to the client.
- [ ] **API-03**: API route validates prompt, length, mode, voice ID, language code, speaker aliases, provider, and output format.
- [ ] **API-04**: API route retries once for transient Fal/Gemini failures and logs full server-side error context.
- [ ] **API-05**: API route returns structured JSON errors with code, message, retryable, and optional details.
- [ ] **API-06**: API route returns `501` structured errors for future providers `clone` and `openai`.
- [ ] **API-07**: Generated audio format defaults to `mp3`.

### Configuration

- [ ] **CONF-01**: App defines MVP voice config for Kore, Puck, Charon, Zephyr, and Aoede.
- [ ] **CONF-02**: Each voice includes id, display name, gender, accent, description, tones, preview text, preview URL, and MVP enabled flag.
- [ ] **CONF-03**: App defines MVP language config for Auto-detect, English (US), and Hindi (India).
- [ ] **CONF-04**: App defines canonical expressive tags: `[laughing]`, `[sigh]`, `[whispering]`, `[excited]`, `[slowly]`, `[fast]`, `[short pause]`, `[dramatic]`, `[cheerfully]`.
- [ ] **CONF-05**: App defines `COST_PER_1K_CHARS = 0.15` in config and displays costs as estimates.

### Static Previews

- [ ] **PREV-01**: Voice preview files are served from `public/previews/`.
- [ ] **PREV-02**: The app has no `/api/tts/preview` route.
- [ ] **PREV-03**: Voice cards play `voice.previewUrl` directly through the audio manager.
- [ ] **PREV-04**: Runtime preview playback never fetches external Google/Fal URLs.
- [ ] **PREV-05**: Missing preview files show a disabled/error preview state.
- [ ] **PREV-06**: Preview starts in under 100ms once the browser has the local asset available.

### Studio UI

- [ ] **UI-01**: User sees a full-page app interface, not a landing page.
- [ ] **UI-02**: Desktop layout uses a two-column work surface with controls left and voice catalog right.
- [ ] **UI-03**: Mobile layout stacks controls without overlapping content.
- [ ] **UI-04**: Top bar shows Audio Studio name, mode toggle, and character counter.
- [ ] **UI-05**: Script editor includes textarea, `CostEstimator`, and `TagInserter` inside the editor component.
- [ ] **UI-06**: User can insert canonical expressive tags at the textarea cursor position.
- [ ] **UI-07**: User can add style instructions separate from the spoken prompt.
- [ ] **UI-08**: User can select language from MVP language options.
- [ ] **UI-09**: User can select one of the MVP voices and see selected state clearly.
- [ ] **UI-10**: Generate button has idle, loading, disabled, success-ready, and error/retry states.
- [ ] **UI-11**: Prompt longer than 3,000 characters shows the required long-script warning.
- [ ] **UI-12**: Empty states exist for no script, no history, no generation, and missing previews.

### Audio Playback

- [ ] **AUDIO-01**: Only one preview or generated audio source can play at a time.
- [ ] **AUDIO-02**: Generated audio player appears only after a successful generation.
- [ ] **AUDIO-03**: User can play, pause, seek, change volume, regenerate, close, and download generated audio.
- [ ] **AUDIO-04**: Download uses provider `audio.url` directly.
- [ ] **AUDIO-05**: Expired or failed audio URLs show a stale-link/error state and allow regeneration.

### Browser Persistence

- [ ] **STORE-01**: Scripts persist after browser refresh using IndexedDB or localStorage.
- [ ] **STORE-02**: Last selected voice, language, mode, and style instructions persist after refresh.
- [ ] **STORE-03**: Generation history metadata persists after refresh.
- [ ] **STORE-04**: Generated audio is stored as provider URL plus metadata only.
- [ ] **STORE-05**: Storage code is isolated behind `lib/client-store.ts` for future ThreeZinc database migration.

### Multi-Speaker MVP

- [ ] **MULTI-01**: User can switch between single and multi-speaker mode without clearing the prompt.
- [ ] **MULTI-02**: Multi-speaker MVP supports exactly two speakers.
- [ ] **MULTI-03**: User can assign a valid voice to each of the two speakers.
- [ ] **MULTI-04**: Speaker aliases are alphanumeric and match prompt prefixes exactly.
- [ ] **MULTI-05**: Switching to multi mode transforms unprefixed text into an editable two-speaker template without losing text.

### ThreeZinc Design

- [ ] **DES-01**: UI uses Inter for body text and Maven Pro for heading/accent use.
- [ ] **DES-02**: UI uses ThreeZinc primary `#3353FE`, primary hover `#1F4CEE`, accent `#32B7EE`, accent hover `#41A7FE`.
- [ ] **DES-03**: UI uses ThreeZinc gradient `#1F4CEE` to `#41A7FE` to `#32B7EE`.
- [ ] **DES-04**: Cards and major controls use 8px radius unless the design system requires smaller.
- [ ] **DES-05**: UI avoids oversized marketing hero layouts, nested cards, and purple-dominant styling.

### Quality and Verification

- [ ] **QUAL-01**: TypeScript strict mode passes with no `any` in app-authored code.
- [ ] **QUAL-02**: Browser console has no app errors during preview, generate, playback, download, and history flows.
- [ ] **QUAL-03**: Phase validation gates are documented and run before moving to the next phase.
- [ ] **QUAL-04**: Accessibility basics are implemented: keyboard access, aria labels, focus states, and visible disabled states.
- [ ] **QUAL-05**: Local preview files and provider generation flow are documented for future maintainers.

## v2 Requirements

### Product Integration

- **PROD-01**: App can be merged into the existing ThreeZinc application routes and layout.
- **PROD-02**: Browser persistence can be replaced with ThreeZinc database/storage integration.
- **PROD-03**: Generated audio can be copied into long-term storage controlled by ThreeZinc.
- **PROD-04**: User accounts, quotas, and billing can be connected to generation usage.

### Expanded Audio Studio

- **EXP-01**: All 30 Gemini voice cards are available.
- **EXP-02**: Full priority language list and expanded supported language picker are available.
- **EXP-03**: Voice catalog includes search, gender filter, and tone filters.
- **EXP-04**: Audio player includes polished waveform visualization.
- **EXP-05**: Hybrid previews can combine static browsing previews with generated selected-voice/style previews.
- **EXP-06**: Voice cloning provider can be implemented behind the existing provider extension point.

## Out of Scope

| Feature | Reason |
|---------|--------|
| SQLite persistence | Frontend cannot directly access SQLite; V1 uses browser storage only |
| Local generated audio files | Provider URL is source of truth in V1 |
| Dynamic preview route | Adds latency/cost and conflicts with static-preview decision |
| Runtime external preview URLs | Previews must be local and instant |
| More than two speakers | MVP locks exactly two speakers until provider behavior is verified |
| Token pricing implementation | V1 uses fixed character estimate only |
| TTS streaming | Provider/docs do not support TTS streaming for this flow |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Pending |
| FOUND-02 | Phase 1 | Pending |
| FOUND-03 | Phase 1 | Pending |
| FOUND-04 | Phase 1 | Pending |
| FOUND-05 | Phase 1 | Pending |
| API-01 | Phase 1 | Pending |
| API-02 | Phase 1 | Pending |
| API-03 | Phase 1 | Pending |
| API-04 | Phase 1 | Pending |
| API-05 | Phase 1 | Pending |
| API-06 | Phase 1 | Pending |
| API-07 | Phase 1 | Pending |
| CONF-01 | Phase 1 | Pending |
| CONF-02 | Phase 1 | Pending |
| CONF-03 | Phase 1 | Pending |
| CONF-04 | Phase 1 | Pending |
| CONF-05 | Phase 1 | Pending |
| PREV-01 | Phase 1 | Pending |
| PREV-02 | Phase 1 | Pending |
| PREV-04 | Phase 1 | Pending |
| UI-01 | Phase 2 | Pending |
| UI-02 | Phase 2 | Pending |
| UI-03 | Phase 2 | Pending |
| UI-04 | Phase 2 | Pending |
| UI-05 | Phase 2 | Pending |
| UI-06 | Phase 2 | Pending |
| UI-07 | Phase 2 | Pending |
| UI-08 | Phase 2 | Pending |
| UI-09 | Phase 2 | Pending |
| UI-10 | Phase 2 | Pending |
| UI-11 | Phase 2 | Pending |
| UI-12 | Phase 2 | Pending |
| PREV-03 | Phase 2 | Pending |
| PREV-05 | Phase 2 | Pending |
| PREV-06 | Phase 2 | Pending |
| AUDIO-01 | Phase 2 | Pending |
| AUDIO-02 | Phase 2 | Pending |
| AUDIO-03 | Phase 2 | Pending |
| AUDIO-04 | Phase 2 | Pending |
| AUDIO-05 | Phase 2 | Pending |
| STORE-01 | Phase 2 | Pending |
| STORE-02 | Phase 2 | Pending |
| STORE-03 | Phase 2 | Pending |
| STORE-04 | Phase 2 | Pending |
| STORE-05 | Phase 2 | Pending |
| DES-01 | Phase 2 | Pending |
| DES-02 | Phase 2 | Pending |
| DES-03 | Phase 2 | Pending |
| DES-04 | Phase 2 | Pending |
| DES-05 | Phase 2 | Pending |
| MULTI-01 | Phase 3 | Pending |
| MULTI-02 | Phase 3 | Pending |
| MULTI-03 | Phase 3 | Pending |
| MULTI-04 | Phase 3 | Pending |
| MULTI-05 | Phase 3 | Pending |
| QUAL-01 | Phase 4 | Pending |
| QUAL-02 | Phase 4 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 4 | Pending |
| QUAL-05 | Phase 4 | Pending |

**Coverage:**
- v1 requirements: 60 total
- Mapped to phases: 60
- Unmapped: 0

---
*Requirements defined: 2026-04-27*
*Last updated: 2026-04-27 after GSD initialization*
