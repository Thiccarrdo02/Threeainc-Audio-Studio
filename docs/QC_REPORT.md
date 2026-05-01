# Quality Control Report

Date: 2026-05-01

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
- Preview language switcher plays English or Hindi local MP3 assets.
- English and Hindi previews exist for all 30 voices.
- Language selector includes Hindi and Indian language options.
- Accent, tone, pace, output format, and creativity controls update state.
- Accent strength slider renders and feeds the generated style instructions.
- ThreeZinc credits are shown instead of USD.
- Credit estimates use the 0.5 credit minimum and 0.5 credit increments.
- Automatic expression markup inserts contextual local tags.
- Automatic expression markup now adds a sensible fallback cue for plain pasted scripts.
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
- Download filenames use ThreeZinc Studio naming instead of provider defaults.
- No `/api/tts/preview` request is made.
- Browser console is clean during smoke tests.
- Vercel deployment config and deployment checklist are present.
- Voice Cloning Lab is separated from the main Fal/Gemini TTS workspace.
- Voice Cloning Lab renders local ElevenLabs clone, voice changer, design, and remix workflows.
- Voice changer output remains transient browser audio and is not written to local project files.

## Security and Storage Checks

- `FAL_KEY` is not present in source or docs.
- `.env.local` is ignored by git.
- Client code does not import `@fal-ai/client`.
- Generated audio is not saved locally.
- Local History remains browser-local metadata and provider URLs only on Vercel.
- No SQLite dependency exists.
- No preview API route exists.
- Vercel docs do not expose the Fal key and explicitly forbid `NEXT_PUBLIC_FAL_KEY`.
- `ELEVENLABS_API_KEY` is server-side only and `.local/` custom voice metadata is git-ignored.

## Dependency Audit

- `npm.cmd audit fix` was attempted.
- `npm.cmd audit --omit=dev` still reports a moderate `postcss` advisory through Next's nested dependency.
- The suggested automatic fix is `npm audit fix --force`, but npm would install `next@9.3.3`, which is a breaking downgrade from Next 16, so it was not applied.

## Known Product Boundary

Generated user audio remains provider-hosted URL metadata only for V1. Durable cross-device history would require an account and storage layer, which is intentionally outside the current local-first scope.

ElevenLabs custom voice output is returned as transient browser audio for local testing and is not written to tracked files or committed local storage.
