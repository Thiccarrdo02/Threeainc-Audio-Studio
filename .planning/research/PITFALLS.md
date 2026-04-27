# Project Research: Pitfalls

**Project:** ThreeZinc Audio Studio
**Date:** 2026-04-27

## Pitfall 1: Frontend Tries To Use Server Storage

Warning signs:

- UI imports SQLite or filesystem modules.
- Browser code references `data/`.
- History save fails in production browser.

Prevention:

- V1 uses `lib/client-store.ts` only.
- No SQLite dependency.
- No local generated audio path fields.

Phase mapping: Phase 2.

## Pitfall 2: Preview Route Reintroduced

Warning signs:

- `app/api/tts/preview/route.ts` exists.
- Preview button calls `fetch('/api/tts/preview')`.
- Preview first click takes provider latency.

Prevention:

- Voice config has `previewUrl`.
- Preview hook plays local static file only.
- Acceptance criteria explicitly checks no preview API route.

Phase mapping: Phase 1 and Phase 2.

## Pitfall 3: Provider Schema Assumed Without Test

Warning signs:

- Route returns `result.data.audio` without guarding shape.
- No sample request is run.
- Error response is generic text.

Prevention:

- Validate provider response shape.
- Retry once.
- Return structured JSON errors.
- Add manual curl/PowerShell validation gate.

Phase mapping: Phase 1.

## Pitfall 4: Generated Audio Download Breaks

Warning signs:

- Anchor download silently opens a new tab.
- CORS blocks blob download.
- Expired URL remains in history without explanation.

Prevention:

- Start with direct URL download.
- Add fallback that fetches blob if CORS permits.
- Show stale-link state and regenerate action.

Phase mapping: Phase 2.

## Pitfall 5: One Audio Source Rule Violated

Warning signs:

- Preview keeps playing while generated player starts.
- Multiple voice previews overlap.
- UI state says one card is playing while another audio element is active.

Prevention:

- Use one module-level/global audio manager.
- Every play action stops current audio first.
- Audio manager owns stop callbacks.

Phase mapping: Phase 2.

## Pitfall 6: Design Drifts To Generic AI Tool

Warning signs:

- Purple gradients dominate.
- Landing hero appears instead of studio UI.
- Cards inside cards.
- Oversized headings in compact panels.

Prevention:

- Use ThreeZinc tokens.
- Build the tool as the first screen.
- Keep density work-focused.

Phase mapping: Phase 2 and Phase 4.

## Pitfall 7: Multi-Speaker Scope Expands Too Early

Warning signs:

- Add speaker button appears before provider test.
- More than two speakers in MVP.
- Mode switch clears prompt.

Prevention:

- Exactly two speakers in MVP.
- Preserve prompt state.
- Auto-template only when helpful.

Phase mapping: Phase 3.

## Pitfall 8: Long Script Quality Surprise

Warning signs:

- Long scripts generate poor or drifting audio without warning.
- User has no reason to split scripts.

Prevention:

- Warning above 3,000 chars.
- Cost and char counter visible.
- Future chunking remains deferred.

Phase mapping: Phase 2.
