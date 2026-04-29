# Quality Control Report

Date: 2026-04-28

## Command Gates

- `npm.cmd run lint` - Passed
- `npm.cmd run typecheck` - Passed
- `npm.cmd run test` - Passed
- `npm.cmd run build` - Passed

## Automated Browser Coverage

- App loads at `http://localhost:3000`.
- Main controls render without the misplaced selected-voice summary.
- Voice Catalog shows 30 voice models.
- Search filter narrows the catalog.
- Gender filter works.
- Tone filter works.
- Local-preview filter narrows the catalog to seeded preview voices.
- Hindi audition mode shows the static-preview boundary message.
- Language selector includes Hindi and Indian language options.
- Accent, tone, pace, output format, and creativity controls update state.
- ThreeZinc credits are shown instead of USD.
- Credit estimates use the 0.5 credit minimum and 0.5 credit increments.
- Automatic expression markup inserts contextual local tags.
- Expanded expression tags are available.
- Switching from single to multi keeps the pasted text only under Speaker 1 and creates a blank Speaker 2 line.
- Speaker 1 and Speaker 2 voices are assigned from the Voice Catalog.
- Speaker chips above the script editor insert dialogue prefixes.
- Generate panel appears after the voice catalog.
- Generate panel shows selected voice model, language, output format, character count, and estimated credits.
- Expressive tag buttons insert text into the script editor.
- Save script writes browser-local metadata.
- Saved script loads back into the editor.
- Single-speaker generation works through `/api/tts/generate`.
- Multi-speaker prompt transform works.
- Multi-speaker generation works through `/api/tts/generate`.
- Generated audio player appears after successful generation.
- Download link points to the provider audio URL.
- No `/api/tts/preview` request is made.
- Browser console is clean during smoke tests.

## Security and Storage Checks

- `FAL_KEY` is not present in source or docs.
- `.env.local` is ignored by git.
- Client code does not import `@fal-ai/client`.
- Generated audio is not saved locally.
- No SQLite dependency exists.
- No preview API route exists.

## Dependency Audit

- `npm.cmd audit fix` was attempted.
- `npm.cmd audit --omit=dev` still reports a moderate `postcss` advisory through Next's nested dependency.
- The suggested automatic fix is `npm audit fix --force`, but npm would install `next@9.3.3`, which is a breaking downgrade from Next 16, so it was not applied.

## Known Product Boundary

Hindi and Indian-language generation are supported. Instant Hindi preview playback remains disabled until owned static Hindi preview WAV files are added to `public/previews/`.
