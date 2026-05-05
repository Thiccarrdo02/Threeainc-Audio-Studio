# Vercel Deployment

ThreeZinc Audio Studio is ready to deploy as a standalone Next.js app on Vercel for testing.

## GitHub Import

1. Push this repository to GitHub.
2. In Vercel, create a new project and import the GitHub repository.
3. Keep the root directory as the repository root.
4. Use the detected Next.js framework preset.
5. Keep the configured commands from `vercel.json`:
   - Install command: `npm ci`
   - Build command: `npm run build`
   - Development command: `npm run dev`

## Environment Variables

Add this variable in Vercel Project Settings for Preview and Production:

```env
FAL_KEY=your_fal_api_key_here
```

Do not create `NEXT_PUBLIC_FAL_KEY`. The Fal key must stay server-side only.

If you also want to test the ElevenLabs tab on Vercel, add:

```env
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
```

After changing environment variables, redeploy the latest commit. Vercel does not
automatically rebuild existing deployments when a new secret is added.

## Runtime Notes

- `app/api/tts/generate/route.ts` uses the Node.js runtime and a `maxDuration` of 60 seconds for longer TTS jobs.
- Generated audio is not saved to Vercel storage or the repository.
- The client stores only browser-local settings, saved scripts, generation metadata, and provider audio URLs.
- Static voice previews are served from `public/previews/`.
- There is no `/api/tts/preview` route.

## Post-Deploy Smoke Test

1. Open the Vercel preview URL.
2. Confirm the app loads directly into the studio.
3. Generate a short single-voice clip.
4. Switch to multi-speaker mode, assign Speaker 1 and Speaker 2 from the catalog, and generate a short dialogue.
5. Confirm costs are shown in ThreeZinc credits only.
6. Confirm the browser console has no runtime errors.

## Troubleshooting

- `FAL_KEY_MISSING`: add `FAL_KEY` to the exact Vercel environment you are testing, then redeploy.
- `PROVIDER_GENERATION_FAILED`: the server reached Fal but Fal rejected or failed the job. The app now shows the sanitized provider message so you can tell whether it is an invalid key, no credits, a model issue, or a temporary provider failure.
- Local generation working does not prove Vercel has the same key. Local uses `.env.local`; Vercel uses Project Settings environment variables.
