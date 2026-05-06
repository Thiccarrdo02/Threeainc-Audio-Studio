# ThreeZinc Audio Studio

Local-first text-to-speech studio for creating polished voice audio with Fal/Gemini TTS. The app runs as a standalone Next.js project, keeps credentials server-side, stores only browser metadata, and uses local static preview MP3s for instant voice auditions.

## Features

- Full app workspace, not a landing page.
- Single-voice generation.
- Exactly-two-speaker dialogue generation.
- 30 selectable Fal/Gemini voice models.
- English and Hindi static previews for every voice model.
- Voice catalog search, gender filter, tone filter, and preview language switcher.
- Separate Voice Lab for instant reference voices, saved-voice speech, cloning, design, transform, remix, and local voice management.
- Multi-speaker voice assignment from the catalog with Speaker 1 and Speaker 2 assignment buttons.
- Speaker chips above the script editor for inserting dialogue prefixes while writing.
- Featured Indian language workflow with Hindi, English India, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, and Punjabi options.
- Accent presets: Neutral, Indian English, Native Hindi, North Indian, South Indian, American, British, and Australian.
- Accent-strength slider for soft, balanced, or strong accent influence.
- Tone presets: Natural, Studio Ad, Explainer, Podcast, News, Social Reel, Meditation, and Dramatic.
- Pace presets: Slow, Steady, and Fast.
- Creativity slider mapped to Fal/Gemini `temperature`.
- Output format selector for `mp3`, `wav`, and `ogg_opus`.
- Expanded expressive tag insertion for tags like `[laughing]`, `[uhm]`, `[whispering]`, `[shouting]`, `[sarcasm]`, `[medium pause]`, and `[long pause]`.
- Local automatic expression markup based on script context.
- ThreeZinc credit estimates with a 0.5 credit minimum and 0.5 credit increments.
- Browser-local saved scripts, settings, and generation history.
- Sticky generated-audio player with play, pause, seek, volume, regenerate, close, and direct download.

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript strict mode
- Tailwind CSS 4
- shadcn/base-ui button primitive
- lucide-react icons
- Fal server-side generation via `@fal-ai/client`

## Local Setup

```powershell
npm install
Copy-Item .env.example .env.local
```

Set the key in `.env.local`:

```env
FAL_KEY=your_fal_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

Run the app:

```powershell
npm.cmd run dev
```

Open `http://localhost:3000`.

## Commands

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd run test
npm.cmd run build
```

## Vercel Deployment

The repository includes `vercel.json` for standalone Vercel testing:

- Framework preset: Next.js.
- Install command: `npm ci`.
- Build command: `npm run build`.
- Server-side generation route: Node.js runtime with a 60 second max duration.

Add `FAL_KEY` in Vercel Project Settings for Preview and Production. Do not add a `NEXT_PUBLIC_` Fal key. Full deployment notes are in `docs/VERCEL_DEPLOYMENT.md`.

## Project Boundaries

- `FAL_KEY` is read only in `app/api/tts/generate/route.ts`.
- `ELEVENLABS_API_KEY` is read only by server-side custom voice routes and helpers.
- The browser never imports `@fal-ai/client`.
- The browser never receives provider API keys.
- Generated audio files are not saved locally.
- Generated audio is stored as remote URL plus metadata only.
- ElevenLabs custom voice metadata is stored locally in ignored `.local/custom-voices.json`.
- ElevenLabs is not used for the main TTS workspace; Fal/Gemini remains the text-to-speech provider.
- Generated output filenames use ThreeZinc names like `threezinc-studio-kore-...mp3`.
- No SQLite or filesystem persistence is used.
- There is no `/api/tts/preview` route.
- Voice preview playback uses local files from `public/previews/`.
- English and Hindi preview playback use owned local MP3 files from `public/previews/en/` and `public/previews/hi/`.

## Important Files

- `AUDIO_APP_PRD.md` - product source of truth.
- `threezinc_design_system (1).md` - visual/design rules.
- `app/api/tts/generate/route.ts` - server-side Fal route.
- `components/studio/tts-studio.tsx` - main studio UI.
- `config/voices.ts` - voice catalog.
- `config/languages.ts` - language catalog.
- `config/style-presets.ts` - accent, tone, and pace presets.
- `config/pricing.ts` - ThreeZinc credit constants.
- `lib/client-store.ts` - browser persistence adapter.
- `lib/cost.ts` - character and credit estimation.
- `lib/tts-validation.ts` - request validation.
- `lib/elevenlabs.ts` - server-only ElevenLabs API adapter.
- `lib/local-custom-voices.ts` - ignored local JSON custom voice store.
- `scripts/generate-voice-previews.mjs` - Fal preview asset generation utility.
- `tests/contracts.test.mjs` - contract and boundary tests.
- `vercel.json` - Vercel project defaults.
- `docs/QC_REPORT.md` - latest quality-control report.
- `docs/ELEVENLABS_LOCAL_VOICE_CLONING.md` - local custom voice architecture.
- `docs/ELEVENLABS_LOCAL_TASKS.md` - local custom voice task list.
- `docs/VERCEL_DEPLOYMENT.md` - Vercel deployment checklist.
- `docs/preview-assets.md` - preview asset notes.

## Environment Safety

`.env.local` is intentionally ignored by git. Do not commit real provider keys.
