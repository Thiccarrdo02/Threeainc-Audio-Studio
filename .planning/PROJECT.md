# ThreeZinc Audio Studio

## What This Is

ThreeZinc Audio Studio is a standalone local-first text-to-speech app for creating polished voice audio from scripts. It lets a creator write or load a script, select a Gemini TTS voice, audition local static voice previews instantly, generate audio through a server-side Fal route, play the result, download it, and recover browser-stored scripts/history after refresh.

V1 is a local browser tool. V2 is the productized ThreeZinc integration with real database/storage and broader app merge work.

## Core Value

A user can locally turn a script into downloadable speech audio with fast voice auditioning and no dependency on ThreeZinc production storage.

## Requirements

### Validated

(None yet - ship to validate)

### Active

- [ ] Standalone Next.js app runs locally and does not depend on the existing ThreeZinc app.
- [ ] Server-side TTS generation works through Fal with `FAL_KEY` protected from the browser.
- [ ] Voice previews play instantly from `public/previews/` static local files.
- [ ] Scripts, generation metadata, and settings persist in browser storage only.
- [ ] Generated audio source of truth is provider `audio.url` plus metadata; generated audio files are not saved locally in V1.
- [ ] ThreeZinc design system is applied: Inter, Maven Pro accents, blue/cyan gradients, compact work-tool density, 8px radius.
- [ ] Single-speaker MVP is stable before expansion.
- [ ] Multi-speaker MVP supports exactly two speakers.
- [ ] All work is planned in GSD artifacts before implementation starts.

### Out of Scope

- Production ThreeZinc database integration - deferred until standalone local app is proven.
- Cloud storage integration - V1 downloads directly from provider URL.
- SQLite or filesystem persistence - creates local/server boundary confusion for V1.
- Runtime voice preview generation - slow, costly, and unnecessary for browsing voices.
- Runtime scraping or fetching of preview audio - previews must be served locally.
- Voice cloning - provider extension point only.
- Accounts, teams, billing, quotas, and multi-user collaboration - not needed for local V1.
- TTS streaming - Gemini TTS docs state TTS does not stream.

## Context

- The source PRD is `AUDIO_APP_PRD.md`.
- The original implementation prompt is `Audio.md`.
- Brand guidance is in `threezinc_design_system (1).md`.
- GSD was installed locally for Codex with `npx.cmd get-shit-done-cc@latest --codex --local`.
- The project is greenfield from an implementation perspective. The workspace currently contains planning docs and source prompts, not an app scaffold.
- The main external provider is Fal model `fal-ai/gemini-3.1-flash-tts` through `@fal-ai/client`.
- Google Cloud Gemini-TTS docs expose static WAV demo files that can seed `public/previews/` for local testing. These are local seed assets only and should be replaced with owned preview files before product launch if licensing requires it.

## Constraints

- **Local-first**: V1 must run on a local PC with browser persistence and local preview assets.
- **Secret safety**: `FAL_KEY` must stay server-side and must never appear in client bundles, logs, or committed files.
- **Storage boundary**: Browser storage only for V1 scripts/history/settings. No SQLite and no local generated audio files.
- **Preview latency**: Preview playback must start in under 100ms once the browser has the local asset available.
- **Provider behavior**: Generation can fail or drift on long scripts; API route must retry once and return structured errors.
- **Pricing**: UI estimate uses `COST_PER_1K_CHARS = 0.15`; no token-pricing implementation in V1.
- **Design**: Use ThreeZinc blue/cyan system, not the violet-heavy palette from the original prompt.
- **Scope discipline**: Finish local MVP before adding all voices, all languages, or product integration work.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use browser storage for V1 | Fastest local-first path and avoids frontend/SQLite confusion | Pending |
| Store generated audio as URL plus metadata only | Fal returns cloud URL; local file saving is extra complexity | Pending |
| Use static local preview files | Instant UX and no repeated provider calls | Pending |
| Support exactly two speakers in MVP | Google docs explicitly describe two-speaker setup; removes ambiguity | Pending |
| Use fixed estimated pricing constant | Fal/Gemini pricing differences should not block V1 | Pending |
| Use canonical expressive tag set | Prevents inconsistent UI insertion and prompt behavior | Pending |
| Plan all work with GSD docs before coding | User requested detailed docs and task list first | Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

After each phase transition:

1. Requirements invalidated? Move to Out of Scope with reason.
2. Requirements validated? Move to Validated with phase reference.
3. New requirements emerged? Add to Active.
4. Decisions to log? Add to Key Decisions.
5. "What This Is" still accurate? Update if drifted.

After each milestone:

1. Full review of all sections.
2. Core Value check - still the right priority?
3. Audit Out of Scope - reasons still valid?
4. Update Context with current state.

---
*Last updated: 2026-04-27 after GSD initialization*
