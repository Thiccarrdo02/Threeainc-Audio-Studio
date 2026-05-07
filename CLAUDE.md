# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ThreeZinc Audio Studio — a local-first, text-to-speech studio built as a Next.js 16 (App Router) application. Users write scripts, select voices/styles, and generate speech audio via the Fal AI Gemini 3.1 Flash TTS model. All user data is persisted to browser localStorage (no backend database).

## Commands

```bash
npm run dev        # Start dev server
npm run build      # Production build
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (run before committing)
npm run test       # Node test runner on tests/*.test.mjs
```

## Architecture

### Request flow

1. User edits script in `tts-studio.tsx` → state managed with `useState` hooks
2. "Generate" triggers `hooks/use-tts-generation.ts` which builds the request payload
3. POST to `/app/api/tts/generate/route.ts` (Node.js runtime, 60s timeout)
4. Server calls Fal AI (`fal.run("fal-ai/gemini-flash-tts/v3")`) and returns audio URL + metadata
5. `hooks/use-audio-manager.ts` handles playback; result saved to localStorage via `lib/client-store.ts`

### Key directories

| Path | Purpose |
|---|---|
| `app/api/tts/generate/` | Server-side TTS endpoint — only place `FAL_KEY` is used |
| `components/studio/` | Two large feature components: `tts-studio.tsx` (main UI) and `custom-voice-lab.tsx` (ElevenLabs voice cloning) |
| `config/` | Static catalogs: voices, languages, style presets, pricing constants |
| `lib/` | `client-store.ts` (localStorage), `cost.ts` (credit billing), `tts-validation.ts` (request validation), `elevenlabs-adapter.ts` |
| `hooks/` | `use-tts-generation.ts`, `use-audio-manager.ts`, `use-voice-preview.ts` |
| `types/` | `tts.ts` and `custom-voices.ts` — all shared TS types |
| `public/previews/` | Static MP3s for instant voice auditions (`en/` and `hi/`) |
| `tests/` | Contract tests using Node's built-in test runner |

### TTS providers

- **Primary**: Fal AI (Gemini 3.1 Flash TTS) — used for all main generation
- **Secondary**: ElevenLabs — isolated to `custom-voice-lab.tsx` and `lib/elevenlabs-adapter.ts` for voice cloning/design

### State & persistence

- No Redux or Context; plain `useState`/`useCallback`/`useEffect`
- localStorage keys (all in `lib/client-store.ts`):
  - `threezinc-audio.settings.v1`
  - `threezinc-audio.scripts.v1` (max 20 scripts)
  - `threezinc-audio.generations.v1` (max 30 records)

### Billing / credits

- `lib/cost.ts` + `config/pricing.ts` — character-based billing with 0.5-credit minimum and 0.5-increment rounding
- Credit estimates are shown live in the UI before generation

### Validation

- `lib/tts-validation.ts` provides structured validation with detailed issue objects and type guards (`isMvpVoiceId`, `isFalTTSOutput`, etc.)
- All API requests are validated server-side before calling Fal

### TTSMode

Scripts operate in two modes defined in `types/tts.ts`: `"single"` (one speaker) and `"multi"` (dialogue with Speaker1/Speaker2 chip insertion).

## Environment Variables

| Variable | Where used |
|---|---|
| `FAL_KEY` | Server only (`app/api/tts/generate/route.ts`) |
| `ELEVENLABS_API_KEY` | Server only (custom voice endpoints) |

Neither key is ever exposed client-side.

## Tests

Tests live in `tests/*.test.mjs` and use Node's built-in test runner — no Jest or Vitest. They cover contract/boundary shapes for API requests and responses.
