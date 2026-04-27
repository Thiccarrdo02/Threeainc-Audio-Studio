# Project Agent Guide

This project uses GSD planning artifacts. Before implementation, read:

1. `.planning/PROJECT.md`
2. `.planning/REQUIREMENTS.md`
3. `.planning/ROADMAP.md`
4. `.planning/research/SUMMARY.md`
5. Relevant files in `.planning/phases/`

## Project Rules

- Keep V1 local-first.
- Do not add SQLite.
- Do not save generated audio files locally.
- Do not create `/api/tts/preview`.
- Do not expose `FAL_KEY` to the browser.
- Do not build a landing page instead of the app.
- Use ThreeZinc design system from `threezinc_design_system (1).md`.
- Use `AUDIO_APP_PRD.md` as the product source of truth.

## Current Phase

Phase 1 is planned in `.planning/phases/001-project-scaffold-provider-foundation/`.

Execute plans in wave order:

1. `001-01-PLAN.md`
2. `001-02-PLAN.md`
3. `001-03-PLAN.md`

## Verification

Run the verification commands listed in each plan before marking work complete. If a command cannot run because credentials are missing, document the blocker and still run all non-provider checks.
