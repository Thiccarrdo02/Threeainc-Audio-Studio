# Phase 1: Project Scaffold and Provider Foundation - Context

**Gathered:** 2026-04-27
**Status:** Ready for planning
**Source:** PRD Express Path (`AUDIO_APP_PRD.md`)

<domain>

## Phase Boundary

Phase 1 creates the runnable Next.js foundation, typed config, preview asset folder/process, and server-side generation route. It does not build the full studio UI. It should prove the backend and local asset assumptions before UI work begins.

</domain>

<decisions>

## Implementation Decisions

### Scaffold

- Use Next.js App Router in the workspace root.
- Use strict TypeScript.
- Use Tailwind CSS.
- Keep the existing PRD and GSD planning docs.
- Add scripts for `dev`, `build`, `lint`, and `typecheck`.

### Provider

- Use `@fal-ai/client`, not deprecated packages.
- Call Fal only from `app/api/tts/generate/route.ts`.
- Protect `FAL_KEY` in `.env.local`.
- Add `.env.example`.
- Default generated output format to `mp3`.
- Retry once for retryable provider failures.
- Return structured errors.

### Config

- MVP voices are Kore, Puck, Charon, Zephyr, Aoede.
- MVP languages are Auto-detect, English (US), Hindi (India).
- Canonical expressive tags are `[laughing]`, `[sigh]`, `[whispering]`, `[excited]`, `[slowly]`, `[fast]`, `[short pause]`, `[dramatic]`, `[cheerfully]`.
- Pricing constant is `COST_PER_1K_CHARS = 0.15`.

### Static Previews

- Create `public/previews/`.
- Do not create `/api/tts/preview`.
- Do not runtime-fetch preview URLs.
- Use WAV seed assets for previews.
- Map Aoede source filename `aoeda` to local `Aoede.wav`.

### the agent's Discretion

- Exact Next.js scaffold command and whether to use `src/` directory.
- Whether to install all shadcn components now or defer until Phase 2.
- Whether preview seed files are downloaded by script or manually documented if network/tooling blocks.

</decisions>

<canonical_refs>

## Canonical References

Downstream agents MUST read these before planning or implementing.

### Product

- `AUDIO_APP_PRD.md` - product scope, acceptance criteria, and fixed V1 decisions.
- `Audio.md` - original implementation prompt and full voice data source.
- `threezinc_design_system (1).md` - ThreeZinc design tokens.

### GSD

- `.planning/PROJECT.md` - project framing and constraints.
- `.planning/REQUIREMENTS.md` - requirement IDs.
- `.planning/ROADMAP.md` - phase boundary and success criteria.
- `.planning/research/SUMMARY.md` - research synthesis.

</canonical_refs>

<specifics>

## Specific Ideas

- Keep a sample API validation command in docs or package script.
- If `FAL_KEY` is missing, route should return a clear setup error, not crash.
- If provider returns unexpected shape, route should return structured error.
- Add helper validation functions that both API and future UI can reuse.

</specifics>

<deferred>

## Deferred Ideas

- Full studio UI.
- Browser persistence.
- Audio player.
- Multi-speaker UI.
- All voices/languages.
- Production ThreeZinc merge.

</deferred>

---
*Phase: 001-project-scaffold-provider-foundation*
*Context gathered: 2026-04-27 via PRD Express Path*
