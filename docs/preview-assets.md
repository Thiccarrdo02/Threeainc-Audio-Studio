# Preview Assets

Phase 1 seeds the MVP voice previews as local WAV files under `public/previews/`.
Runtime preview playback must use these local files directly and must not fetch
Google or Fal URLs in the browser.

## Seed Sources

These files were downloaded once from Google Cloud's public Gemini-TTS demo
assets for local development:

| Voice | Source URL | Local File |
| --- | --- | --- |
| Kore | `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-kore.wav` | `public/previews/Kore.wav` |
| Puck | `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-puck.wav` | `public/previews/Puck.wav` |
| Charon | `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-charon.wav` | `public/previews/Charon.wav` |
| Zephyr | `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-zephyr.wav` | `public/previews/Zephyr.wav` |
| Aoede | `https://docs.cloud.google.com/static/text-to-speech/docs/audio/chirp3-hd-aoeda.wav` | `public/previews/Aoede.wav` |

The Aoede source filename is `aoeda`; keep the app-facing local file named
`Aoede.wav` to match the provider voice ID.

Before product launch, replace these seed files with owned ThreeZinc preview
assets if licensing review requires it.
