# Roadmap: ThreeZinc Audio Studio

**Created:** 2026-04-27
**Granularity:** fine
**Source:** `AUDIO_APP_PRD.md`

## Milestone 1: Local V1 Audio Studio

Goal: Build a production-ready local browser tool that can later be merged into ThreeZinc.

## Phase Overview

| # | Phase | Goal | Requirements | UI Hint | Status |
|---|-------|------|--------------|---------|--------|
| 1 | Project Scaffold and Provider Foundation | Create runnable Next.js app, core config, static previews, validation, and generate API | FOUND-01..05, API-01..07, CONF-01..05, PREV-01, PREV-02, PREV-04 | no | Planned |
| 2 | Single-Speaker Studio MVP | Build the main studio UI, local preview playback, audio player, and browser persistence | UI-01..12, PREV-03, PREV-05, PREV-06, AUDIO-01..05, STORE-01..05, DES-01..05 | yes | Not Started |
| 3 | Two-Speaker Mode and Expansion | Add exactly-two-speaker mode and controlled expansion path | MULTI-01..05 | yes | Not Started |
| 4 | Production Readiness and Handoff | Verify quality gates, accessibility, docs, and local production readiness | QUAL-01..05 | yes | Not Started |

## Phase Details

### Phase 1: Project Scaffold and Provider Foundation

**Goal:** Create the runnable app foundation and prove server-side TTS generation before building the UI.

**Requirements:** FOUND-01, FOUND-02, FOUND-03, FOUND-04, FOUND-05, API-01, API-02, API-03, API-04, API-05, API-06, API-07, CONF-01, CONF-02, CONF-03, CONF-04, CONF-05, PREV-01, PREV-02, PREV-04

**Success criteria:**

1. `npm run dev`, `npm run lint`, `npm run typecheck`, and `npm run build` exist.
2. App scaffold uses Next.js App Router and strict TypeScript.
3. Config files define MVP voices, languages, tags, pricing, and limits.
4. `public/previews/` contains the MVP local preview files or a documented script/task to fetch them before UI work.
5. No `/api/tts/preview` route exists.
6. `POST /api/tts/generate` validates input, protects `FAL_KEY`, calls Fal server-side, retries once, and returns structured success/error JSON.
7. Backend phase validation can be run with a sample request.

**Plans:**

- Wave 1: 001-01 scaffold, theme, dependencies, config
- Wave 2: 001-02 static preview assets and validation helpers
- Wave 3: 001-03 generate API route and backend validation

### Phase 2: Single-Speaker Studio MVP

**Goal:** Build the usable local studio for single-speaker generation, preview, playback, persistence, and ThreeZinc UI.

**Requirements:** UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10, UI-11, UI-12, PREV-03, PREV-05, PREV-06, AUDIO-01, AUDIO-02, AUDIO-03, AUDIO-04, AUDIO-05, STORE-01, STORE-02, STORE-03, STORE-04, STORE-05, DES-01, DES-02, DES-03, DES-04, DES-05

**Success criteria:**

1. User can write a script, insert tags, set style, choose language, choose voice, generate audio, play it, and download it.
2. Preview playback starts from local static assets and never calls a preview route.
3. Only one preview/generated audio source can play at a time.
4. Scripts/settings/history persist after refresh using browser storage.
5. Empty states, long-script warning, missing preview state, loading states, and retry states are visible.
6. Desktop and mobile layouts are usable without overlap.
7. UI clearly follows ThreeZinc visual system.

### Phase 3: Two-Speaker Mode and Expansion

**Goal:** Add exactly-two-speaker dialogue mode and prepare controlled expansion to more voices/languages after MVP stability.

**Requirements:** MULTI-01, MULTI-02, MULTI-03, MULTI-04, MULTI-05

**Success criteria:**

1. User can switch between single and multi mode without losing prompt text.
2. Multi mode provides exactly two speaker slots.
3. Speaker aliases validate as alphanumeric and match prompt prefixes.
4. Unprefixed prompt text is preserved and transformed into an editable two-speaker template.
5. Multi-speaker backend request is validated and tested.

### Phase 4: Production Readiness and Handoff

**Goal:** Harden the app for local production testing and prepare a future ThreeZinc merge handoff.

**Requirements:** QUAL-01, QUAL-02, QUAL-03, QUAL-04, QUAL-05

**Success criteria:**

1. Strict typecheck, lint, build, and targeted tests pass.
2. Browser console has no app errors during happy path.
3. Manual validation checklist is completed for preview, generation, download, storage, mobile, and error states.
4. Accessibility basics are checked.
5. Handoff docs describe local operation, provider setup, preview assets, storage boundary, and future ThreeZinc integration notes.

## Coverage

- v1 requirements: 60
- mapped to phases: 60
- unmapped: 0

## Cross-Cutting Constraints

- Never expose `FAL_KEY` client-side.
- Never add `/api/tts/preview`.
- Never add SQLite or local generated audio file persistence in V1.
- Use browser storage only for local V1 metadata.
- Use ThreeZinc design system, not generic violet AI styling.
- Validate each phase before moving forward.
