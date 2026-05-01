# ElevenLabs Local Tasks

## Build

- Add `ELEVENLABS_API_KEY` placeholder to `.env.example`.
- Ignore `.local/` in git.
- Add server-only local custom voice store.
- Add server-only ElevenLabs client helper.
- Add custom voice API routes for clone, list, instant reference voice text, voice changer, design, remix, save generated voice, and delete.
- Add a separate Voice Cloning Lab tab outside the main TTS workspace.
- Keep voice-changer output audio transient in browser memory.
- Update README and QC docs.

## Verify

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- Confirm custom voice routes do not expose API keys.
- Confirm `.local/custom-voices.json` is ignored.
- Confirm cloning requires consent.
- Confirm Voice Cloning Lab is separate from the main TTS workspace.
- Confirm Instant Text tab accepts one reference voice and target text.
- Confirm voice changer returns playable audio bytes when a target voice and source performance are provided.
- Confirm delete calls ElevenLabs then removes local metadata.
