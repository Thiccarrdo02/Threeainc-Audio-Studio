# Detailed Task List

**Project:** ThreeZinc Audio Studio
**Date:** 2026-04-27
**Source:** `.planning/ROADMAP.md`

## Phase 1: Project Scaffold and Provider Foundation

### 1.1 Scaffold App

- [ ] Run Next.js scaffold in the workspace root.
- [ ] Use TypeScript.
- [ ] Use App Router.
- [ ] Add Tailwind CSS.
- [ ] Confirm no generated scaffold conflicts with existing PRD/planning docs.
- [ ] Add scripts: `dev`, `build`, `lint`, `typecheck`.
- [ ] Add `.env.example` with `FAL_KEY=`.
- [ ] Add basic root page that can later import `TTSStudio`.

### 1.2 Dependencies and UI Base

- [ ] Install `@fal-ai/client`.
- [ ] Install `framer-motion`.
- [ ] Install `lucide-react`.
- [ ] Initialize shadcn/ui if not already present.
- [ ] Add shadcn components required for Phase 2.
- [ ] Add ThreeZinc theme tokens to Tailwind/global CSS.
- [ ] Ensure Inter/Maven Pro font strategy is documented or configured.

### 1.3 Types and Config

- [ ] Create `types/tts.ts`.
- [ ] Create `config/voices.ts`.
- [ ] Create `config/languages.ts`.
- [ ] Create `config/expressive-tags.ts`.
- [ ] Create `config/pricing.ts`.
- [ ] Create `config/limits.ts`.
- [ ] Add helper functions for voice/language validation.

### 1.4 Static Preview Assets

- [ ] Create `public/previews/`.
- [ ] Add or script local seed download for Kore, Puck, Charon, Zephyr, Aoede.
- [ ] Map Google `aoeda` source to local `Aoede.wav`.
- [ ] Document preview source and local-only caveat.
- [ ] Confirm no runtime preview route exists.

### 1.5 Provider Route

- [ ] Create `app/api/tts/generate/route.ts`.
- [ ] Parse JSON safely.
- [ ] Validate prompt and limits.
- [ ] Validate mode.
- [ ] Validate voice/language/speaker aliases.
- [ ] Build Fal input for single mode.
- [ ] Build Fal input for exactly-two-speaker mode.
- [ ] Set `output_format: "mp3"` default.
- [ ] Retry once for retryable provider failures.
- [ ] Return structured success response.
- [ ] Return structured error response.
- [ ] Return `501` for `clone` and `openai`.

### 1.6 Backend Validation

- [ ] Run lint.
- [ ] Run typecheck.
- [ ] Run build.
- [ ] Run API bad-input test.
- [ ] Run API missing-key test if no `FAL_KEY`.
- [ ] Run API sample generation test if `FAL_KEY` exists.
- [ ] Record validation result.

## Phase 2: Single-Speaker Studio MVP

- [ ] Build `useAudioManager`.
- [ ] Build `useVoicePreview`.
- [ ] Build `useTTSGeneration`.
- [ ] Build `lib/client-store.ts`.
- [ ] Build `TTSStudio`.
- [ ] Build `TopBar`.
- [ ] Build `StudioControls`.
- [ ] Build `ScriptEditor` with nested `CostEstimator` and `TagInserter`.
- [ ] Build `StyleDirector`.
- [ ] Build `GenerateButton`.
- [ ] Build `VoiceCatalog`.
- [ ] Build `VoiceCard`.
- [ ] Build `AudioPlayer`.
- [ ] Build `LocalHistoryPanel`.
- [ ] Validate preview, generation, playback, download, refresh persistence, and mobile layout.

## Phase 3: Two-Speaker Mode and Expansion

- [ ] Add exactly-two-speaker mode state.
- [ ] Add mode switch prompt preservation.
- [ ] Add two speaker voice assignments.
- [ ] Validate aliases.
- [ ] Transform unprefixed prompt safely.
- [ ] Test multi-speaker API request.
- [ ] Decide whether to expand voices/languages after the exactly-two-speaker path works.

## Phase 4: Production Readiness and Handoff

- [ ] Add targeted tests for validation helpers.
- [ ] Add manual QA checklist.
- [ ] Run lint/typecheck/build.
- [ ] Check browser console during main flows.
- [ ] Check accessibility basics.
- [ ] Document local setup.
- [ ] Document preview asset process.
- [ ] Document future ThreeZinc database/storage migration.
- [ ] Update PRD if implementation decisions changed.
