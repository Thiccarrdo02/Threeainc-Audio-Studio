# ElevenLabs Local Voice Cloning

Date: 2026-05-01

## Direction

ThreeZinc Audio Studio will use ElevenLabs only for the first local custom-voice release. Other providers and Supabase are intentionally out of scope for this pass.

This version is local-first:

- `ELEVENLABS_API_KEY` stays server-side in `.env.local`.
- Custom voice metadata is stored in `.local/custom-voices.json`.
- Voice-changer output is returned to the browser as a transient Blob URL for play/download.
- Voice-changer output audio files are not written to disk.
- Cloned voice IDs live in the connected ElevenLabs account and are referenced locally by metadata.

## ElevenLabs Features Used

Sources:

- Add Voice API: `POST /v1/voices/add`
- Voice Changer API: `POST /v1/speech-to-speech/:voice_id`
- Voice Design API: `POST /v1/text-to-voice/create-previews`, then `POST /v1/text-to-voice`
- Voice Remix API: `POST /v1/text-to-voice/:voice_id/remix`, then `POST /v1/text-to-voice`

## Local Data Model

Stored in `.local/custom-voices.json`:

```json
{
  "voices": [
    {
      "id": "local_voice_x",
      "provider": "elevenlabs",
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
- `POST /api/custom-voices/clone` uploads one or more audio samples and creates an instant clone.
- `POST /api/custom-voices/voice-changer` converts uploaded performance audio into the selected custom voice.
- `POST /api/custom-voices/design` creates voice-design previews from a text description.
- `POST /api/custom-voices/remix` creates voice-remix previews from an owned voice.
- `POST /api/custom-voices/save-generated` saves a selected design/remix preview into the voice library.
- `DELETE /api/custom-voices/:voiceId` deletes a voice from ElevenLabs and removes local metadata.

## UX

Add a separate Voice Cloning Lab tab beside the main TTS Studio tab:

- Voice Library: local list with selected voice, source badge, refresh, delete.
- Instant Clone: name, description, metadata labels, styled audio uploader, sample cleanup toggle, consent checkbox, create button feedback.
- Voice Changer: target voice summary, styled source-performance uploader, output format, seed, cleanup toggle, stability, similarity, style, speed, speaker boost, conversion output player.
- Voice Design: prompt chips, loudness, quality, guidance, seed, previews, save chosen preview.
- Voice Remix: remix selected custom voice with prompt-strength slider, previews, save variant.

## Guardrails

- Do not expose `ELEVENLABS_API_KEY` to the browser.
- Do not commit `.env.local` or `.local/custom-voices.json`.
- Do not write voice-changer output audio to local files.
- Require a consent checkbox before any clone upload.
- Delete custom voices through the provider delete endpoint when the user deletes a local voice.

## Quality Defaults

- Output default: `mp3_44100_128`.
- Stability default: `0.5`.
- Similarity boost default: `0.8`.
- Style default: `0.1`.
- Speed default: `1`.
- Speaker boost default: enabled.
