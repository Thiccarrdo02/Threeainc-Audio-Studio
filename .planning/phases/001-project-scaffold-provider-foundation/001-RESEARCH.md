# Phase 1 Research: Project Scaffold and Provider Foundation

**Date:** 2026-04-27
**Phase:** 001 - Project Scaffold and Provider Foundation

## Objective

Research what must be true before implementation starts for Phase 1 to succeed.

## Key Findings

### Next.js Scaffold

The cleanest path is to scaffold a standard Next.js App Router app in the workspace root. Because the workspace already contains PRD/planning docs, the implementation agent must avoid overwriting them. If `create-next-app` refuses to scaffold into a non-empty directory, use a temporary scaffold directory and copy generated app files into the root carefully.

### Provider Route

Fal's browser guidance requires server proxying so credentials stay private. The generate route must be the only provider boundary. The route must validate request shape before calling Fal to avoid unclear provider errors and accidental malformed billing calls.

### Static Previews

Static previews can be seeded from Google Cloud docs WAV files for local testing:

- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-kore.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-puck.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-charon.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-zephyr.wav`
- `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-aoeda.wav`

These should become local files under `public/previews/`. The app should never play these external URLs directly.

### Validation Helpers

Create shared validation helpers early:

- voice exists
- language exists or empty auto-detect
- prompt not empty
- prompt within max length
- mode is single/multi
- two speakers for multi mode
- speaker aliases alphanumeric
- provider is supported or returns 501
- output format is allowed

### Build Order

1. Scaffold and dependencies.
2. Theme/config/types.
3. Preview folder/assets.
4. Validation helpers.
5. Generate route.
6. Backend validation commands.

## Validation Architecture

Phase 1 should be verified with:

- File existence checks.
- `npm run lint`.
- `npm run typecheck`.
- `npm run build`.
- Bad-request API test.
- Missing-key API test.
- Real provider sample test only when `FAL_KEY` is configured.

## Risks

- `create-next-app` may not like non-empty directory.
- PowerShell may block `.ps1` npm/npx shims; use `.cmd` shims on Windows.
- Provider response shape may differ from prompt examples.
- Downloading preview files can fail if URLs change.
- shadcn initialization can be interactive; use non-interactive flags where available.

## Recommendation

Proceed with three atomic plans:

1. Scaffold/config/types.
2. Static preview assets and validation helpers.
3. Generate route and backend validation.
