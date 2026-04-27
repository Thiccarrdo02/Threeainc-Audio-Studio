# Project Research Summary

**Project:** ThreeZinc Audio Studio
**Date:** 2026-04-27

## Stack Summary

Use a standalone Next.js App Router project with strict TypeScript, Tailwind, shadcn/ui, lucide-react, Framer Motion, native `HTMLAudioElement`, and server-side Fal calls through `@fal-ai/client`.

## Core Architecture

- Server route only for TTS generation.
- Client-only browser persistence.
- Static local preview files.
- Config-driven voices, languages, tags, pricing, and limits.
- Audio manager enforces one active audio source.

## Table Stakes

- Local app runs.
- Generate route works.
- Static previews play instantly.
- Studio UI lets user write, direct, select, generate, play, download, and save metadata.
- Errors and empty states are explicit.
- ThreeZinc design system is visible.

## Watch Outs

- Do not create preview API.
- Do not use SQLite.
- Do not save generated audio files locally.
- Do not expose `FAL_KEY`.
- Do not allow more than two speakers in MVP.
- Do not skip provider validation after backend phase.

## Roadmap Implication

Use four implementation phases:

1. Scaffold, config, static previews, and provider route.
2. Single-speaker UI MVP, audio playback, and browser persistence.
3. Exactly-two-speaker mode and catalog expansion.
4. Production-readiness polish, verification, docs, and handoff.
