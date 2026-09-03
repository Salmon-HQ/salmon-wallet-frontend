# AGENTS.md instructions for `packages/shared/src/theme`

Refines the repo-root `AGENTS.md` (canonical rules) for this folder.
This is the single source of shared visual primitives.

## Responsibility

- shared design tokens

## Rules

- Keep colors, spacing, typography, shadows, and durations centralized
  here — one token source keeps both apps visually consistent.
- Prefer extending tokens here over scattering hardcoded values across
  apps and packages — hardcoded values silently drift when the design
  changes.
