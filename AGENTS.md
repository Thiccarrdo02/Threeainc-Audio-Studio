# Project Agent Guide

ThreeZinc Audio Studio is a local-first Next.js TTS studio. Use `AUDIO_APP_PRD.md` as the product source of truth and `threezinc_design_system (1).md` for visual guidance.

## Guardrails

- Keep V1 local-first.
- Do not add SQLite.
- Do not save generated audio files locally.
- Do not create `/api/tts/preview`.
- Do not expose `FAL_KEY` to the browser.
- Do not build a landing page instead of the app.
- Keep generated audio as provider URL plus metadata only.
- Keep static voice previews under `public/previews/`.

## Verification

Run before shipping:

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```
