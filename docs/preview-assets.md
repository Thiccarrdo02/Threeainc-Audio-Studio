# Preview Assets

Voice previews are owned ThreeZinc static MP3 files under `public/previews/`.
Runtime preview playback uses these local files directly and must not fetch
Google or Fal URLs in the browser.

## Current Asset Set

- English previews: `public/previews/en/{Voice}.mp3`
- Hindi previews: `public/previews/hi/{Voice}.mp3`
- Manifest: `public/previews/manifest.json`

The current set covers all 30 Fal/Gemini voices in the catalog, with one
English MP3 and one Hindi MP3 for each voice.

## Generation Utility

Use this local utility to regenerate missing preview assets:

```powershell
node scripts\generate-voice-previews.mjs
```

Use `--force` to regenerate existing MP3s. The script reads `FAL_KEY` from
`.env.local` or the process environment and never writes the key to disk.

English prompt:

```text
Welcome to ThreeZinc platform, [expression] Audio Studio.
```

Hindi prompt:

```text
थ्रीज़िंक प्लेटफॉर्म के ऑडियो स्टूडियो में [expression] आपका स्वागत है।
```
