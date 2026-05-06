# Custom Voice Lab

Date: 2026-05-06

## Direction

ThreeZinc Audio Studio keeps the main TTS Studio on the existing local-first
Fal/Gemini flow. The separate Voice Lab adds custom voice workflows without
requiring Supabase, SQLite, or local audio storage.

This version is local-first:

- Provider keys stay server-side in `.env.local`.
- Custom voice metadata is stored in `.local/custom-voices.json`.
- Generated audio is returned to the browser as a transient provider URL or
  Blob URL for play/download.
- Generated audio files are not written to disk.
- Saved custom voice IDs live with their provider and are referenced locally by
  metadata.
- Provider names are kept out of the visible product UI.

## Provider Features Used

Sources:

- Instant clone API: `fal-ai/minimax/voice-clone`
- Saved clone speech API: `fal-ai/minimax/speech-02-hd`
- Public voice library API: `GET /v1/shared-voices`
- Add shared voice API: `POST /v1/voices/add/:public_user_id/:voice_id`
- Voice Changer API: `POST /v1/speech-to-speech/:voice_id`
- Create Voice API: `POST /v1/text-to-voice/design`, then `POST /v1/text-to-voice`
- Voice Remix API: `POST /v1/text-to-voice/:voice_id/remix`, then `POST /v1/text-to-voice`
- Saved Voice Speech API: `POST /v1/text-to-speech/:voice_id`

## Local Data Model

Stored in `.local/custom-voices.json`:

```json
{
  "voices": [
    {
      "id": "local_voice_x",
      "provider": "fal",
      "voiceId": "provider_voice_id",
      "name": "Creator Voice",
      "description": "Warm creator voice",
      "source": "instant-clone",
      "settings": {
        "stability": 0.5,
        "similarityBoost": 0.8,
        "style": 0.1,
        "speed": 1,
        "useSpeakerBoost": true
      },
      "createdAt": "iso",
      "updatedAt": "iso"
    }
  ]
}
```

`.local/` is ignored by git.

## API Routes

- `GET /api/custom-voices` lists local custom voices.
- `POST /api/custom-voices/instant-clone` uploads one reference sample and
  target text, creates a same-voice result, and stores the reusable clone ID in
  local metadata.
- `POST /api/custom-voices/clone` remains server-side for accounts that support
  direct saved clone creation, but it is not the primary visible flow.
- `POST /api/custom-voices/speech` generates text with a saved custom voice.
- `POST /api/custom-voices/voice-changer` converts uploaded performance audio into the selected custom voice.
- `POST /api/custom-voices/design` creates voice-design previews from a text description.
- `POST /api/custom-voices/remix` creates voice-remix previews from an owned voice.
- `GET /api/custom-voices/library` searches public voices.
- `POST /api/custom-voices/library/import` imports a public voice into the local
  library.
- `POST /api/custom-voices/save-generated` saves a selected design/remix preview into the voice library.
- `DELETE /api/custom-voices/:voiceId` deletes/removes a saved voice through the
  correct provider path and removes local metadata.

## UX

Add a separate Voice Cloning Lab tab beside the main TTS Studio tab:

- Voice Library: local list with selected voice, source badge, refresh, delete.
- Instant Clone: upload one clear 10+ second reference voice, type target text,
  choose clone quality, estimate ThreeZinc credits, generate output, save the
  reusable clone ID, then continue in Use Voice.
- Use Voice: select a saved custom voice, enter text, estimate ThreeZinc credits, tune stability/similarity/style/speed/speaker boost, generate transient output.
- Transform Audio: target voice summary, styled source-performance uploader, duration-based credit estimate, output format, seed, cleanup toggle, stability, similarity, style, speed, speaker boost, conversion output player.
- Create Voice: prompt preset chips, loudness, quality, guidance, seed, previews,
  save chosen preview.
- Voice Remix: remix selected custom voice with prompt-strength slider, previews, save variant.
- Browse Voices: search public voices, audition previews, import to local library.

## Guardrails

- Do not expose provider keys to the browser.
- Do not commit `.env.local` or `.local/custom-voices.json`.
- Do not write voice-changer output audio to local files.
- Do not write instant reference voice text preview audio to local files.
- Delete custom voices through the provider delete endpoint when the user deletes a local voice.

## Quality Defaults

- Output default: `mp3_44100_128`.
- Stability default: `0.5`.
- Similarity boost default: `0.8`.
- Style default: `0.1`.
- Speed default: `1`.
- Speaker boost default: enabled.
