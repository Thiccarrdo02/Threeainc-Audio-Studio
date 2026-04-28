# Feature Research: Competitive TTS Studio

Date: 2026-04-28

## Sources Checked

- Fal Gemini 3.1 Flash TTS API: https://fal.ai/models/fal-ai/gemini-3.1-flash-tts/api
- Google Gemini TTS docs: https://ai.google.dev/gemini-api/docs/speech-generation
- ElevenLabs Text to Speech: https://elevenlabs.io/text-to-speech
- Murf AI product surface: https://murf.ai/

## Useful Patterns

- Voice discovery is a major product feature. ElevenLabs emphasizes a large searchable library with voice, language, gender, accent, and use-case discovery.
- Style control should be first-class. Fal/Gemini and Google both support natural language steering for accent, pace, tone, and emotional expression.
- Inline expressive tags are table stakes for modern TTS. Fal/Gemini supports tags such as laughter, sighs, whispering, and pauses.
- Output format selection matters. Fal/Gemini exposes `mp3`, `wav`, and `ogg_opus`; ElevenLabs also markets workflow-specific export formats.
- Multilingual and regional accents are important, especially for language learning and creator workflows. ElevenLabs explicitly calls out comparing American, British, Australian, Indian, and other accents.
- Voice cloning, voice design, dubbing, pronunciation dictionaries, SSML, and real-time streaming are strong competitor features, but they are out of the current local-first Fal/Gemini V1 boundary.

## Decisions For This App

- Implement the full Fal/Gemini 30-voice catalog now.
- Add full provider language coverage, with Indian languages featured at the top.
- Add accent, tone, pace, output format, and creativity controls.
- Keep all generation behind the existing server-only `/api/tts/generate` route.
- Keep static preview playback local-only; do not generate or save Hindi previews locally in V1.
- Mark Hindi instant previews as pending owned local assets while enabling Hindi and Indian-language generation.

