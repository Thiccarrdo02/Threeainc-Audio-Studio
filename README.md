# ThreeZinc Audio Studio

Local-first text-to-speech studio for creating polished voice audio with Fal/Gemini TTS. The app runs as a standalone Next.js project, keeps credentials server-side, stores only browser metadata, and uses local static preview WAVs for instant voice auditions.

## Features

- Full app workspace, not a landing page.
- Single-voice generation.
- Exactly-two-speaker dialogue generation.
- 30 selectable Fal/Gemini voice models.
- Voice catalog search, gender filter, tone filter, and local-preview filter.
- Featured Indian language workflow with Hindi, English India, Marathi, Tamil, Telugu, Gujarati, Kannada, Malayalam, and Punjabi options.
- Accent presets: Neutral, Indian English, Native Hindi, North Indian, South Indian, American, British, and Australian.
- Tone presets: Natural, Studio Ad, Explainer, Podcast, News, Social Reel, Meditation, and Dramatic.
- Pace presets: Slow, Steady, and Fast.
- Creativity slider mapped to Fal/Gemini `temperature`.
- Output format selector for `mp3`, `wav`, and `ogg_opus`.
- Expressive tag insertion for tags like `[laughing]`, `[whispering]`, `[excited]`, and `[short pause]`.
- Estimated credit/cost display based on billable characters.
- Browser-local saved scripts, settings, and generation history.
- Sticky generated-audio player with play, pause, seek, volume, regenerate, close, and direct provider download.

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

## Project Boundaries

- `FAL_KEY` is read only in `app/api/tts/generate/route.ts`.
- The browser never imports `@fal-ai/client`.
- Generated audio files are not saved locally.
- Generated audio is stored as provider URL plus metadata only.
- No SQLite or filesystem persistence is used.
- There is no `/api/tts/preview` route.
- Voice preview playback uses local files from `public/previews/`.
- Hindi generation is supported, but instant Hindi preview playback needs owned local Hindi preview files before it can be enabled.

## Important Files

- `AUDIO_APP_PRD.md` - product source of truth.
- `threezinc_design_system (1).md` - visual/design rules.
- `app/api/tts/generate/route.ts` - server-side Fal route.
- `components/studio/tts-studio.tsx` - main studio UI.
- `config/voices.ts` - voice catalog.
- `config/languages.ts` - language catalog.
- `config/style-presets.ts` - accent, tone, and pace presets.
- `lib/client-store.ts` - browser persistence adapter.
- `lib/tts-validation.ts` - request validation.
- `tests/contracts.test.mjs` - contract and boundary tests.
- `docs/QC_REPORT.md` - latest quality-control report.
- `docs/preview-assets.md` - preview asset notes.

## Environment Safety

`.env.local` is intentionally ignored by git. Do not commit real provider keys.

