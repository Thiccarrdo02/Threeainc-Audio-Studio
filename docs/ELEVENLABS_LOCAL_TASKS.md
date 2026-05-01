# ElevenLabs Local Tasks

## Build

- Add `ELEVENLABS_API_KEY` placeholder to `.env.example`.
- Ignore `.local/` in git.
- Add server-only local custom voice store.
- Add server-only ElevenLabs client helper.
- Add custom voice API routes for clone, list, generate, voice changer, design, remix, save generated voice, and delete.
- Add Custom Voice Lab UI.
- Keep generated custom voice audio transient in browser memory.
- Update README and QC docs.

## Verify

- `npm.cmd run lint`
- `npm.cmd run typecheck`
- `npm.cmd run test`
- `npm.cmd run build`
- Confirm custom voice routes do not expose API keys.
- Confirm `.local/custom-voices.json` is ignored.
- Confirm cloning requires consent.
- Confirm custom TTS response returns playable audio bytes.
- Confirm delete calls ElevenLabs then removes local metadata.
