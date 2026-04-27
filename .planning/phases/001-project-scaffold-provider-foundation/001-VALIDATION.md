---
phase: 1
slug: project-scaffold-provider-foundation
date: 2026-04-27
---

# Validation Strategy: Phase 1

## Required Checks

- `npm run lint`
- `npm run typecheck`
- `npm run build`
- File check: `app/api/tts/generate/route.ts` exists.
- File check: `app/api/tts/preview/route.ts` does not exist.
- File check: `public/previews/Kore.wav`, `Puck.wav`, `Charon.wav`, `Zephyr.wav`, `Aoede.wav` exist or preview acquisition blocker is documented.
- API bad request returns structured JSON.
- API missing `FAL_KEY` returns setup error instead of crashing.
- API valid sample returns audio when `FAL_KEY` is configured.

## Manual Provider Test Payload

```json
{
  "mode": "single",
  "prompt": "Welcome to ThreeZinc Audio Studio.",
  "style_instructions": "Speak clearly and confidently.",
  "voice": "Kore",
  "language_code": "English (US)",
  "provider": "gemini",
  "output_format": "mp3"
}
```

## Pass Criteria

Phase 1 passes when the app scaffold builds, config is typed, previews are locally staged or explicitly blocked, and the generation route handles both invalid and valid paths correctly.
