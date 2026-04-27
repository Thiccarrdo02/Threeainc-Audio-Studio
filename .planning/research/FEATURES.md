# Project Research: Features

**Project:** ThreeZinc Audio Studio
**Date:** 2026-04-27

## Table Stakes For V1

### Script Authoring

- Script textarea with strong placeholder guidance.
- Character count and estimated cost.
- Long-script warning above 3,000 characters.
- Expressive tag insertion at cursor position.
- Separate style instructions field.

### Voice Selection

- MVP voice list with 5 voices.
- Voice card selected state.
- Static local preview play/pause.
- Missing preview state.
- One audio source at a time.

### Generation

- Single-speaker generation through server route.
- Structured request and response types.
- Validation on client and server.
- Loading, retry, and structured errors.
- Direct generated audio playback.
- Direct download from provider URL.

### Persistence

- Browser-stored scripts.
- Browser-stored generation history metadata.
- Browser-stored settings.
- Empty history state.

### Design

- ThreeZinc colors and gradients.
- Compact work-tool layout.
- Dark-mode-ready but not violet-dominant.
- Mobile responsive layout.
- Accessible controls.

## Differentiators

- Expressive tags are presented as first-class controls rather than hidden prompt syntax.
- Static previews make browsing voices feel instant.
- Style direction is separated from spoken text.
- Exactly-two-speaker mode can be introduced cleanly after the single-speaker MVP.

## Deferred Features

- All 30 voices.
- Full language list.
- Voice search and filters.
- Waveform visualization.
- Dynamic selected-style preview.
- Long-term generated audio storage.
- ThreeZinc database integration.
- Voice cloning.
- Billing/quotas/accounts.

## Feature Build Order

1. Provider route and config.
2. Static preview asset pipeline.
3. Audio manager.
4. Script editor and generation controls.
5. Audio player.
6. Browser persistence.
7. Two-speaker mode.
8. Expansion/polish.

## Must Not Build In V1

- `/api/tts/preview`.
- SQLite persistence.
- `data/generated/`.
- Runtime preview URL fetching.
- More than two speakers.
