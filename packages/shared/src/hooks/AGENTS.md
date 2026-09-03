# AGENTS.md instructions for `packages/shared/src/hooks`

Refines the repo-root `AGENTS.md` (canonical rules) for this folder.

## Responsibility

- shared hooks and orchestration used by multiple apps

## Rules

- Keep hooks cross-platform unless there is an explicit shim pattern — a
  browser-only or native-only API in a shared hook breaks the other
  platforms at runtime, not at build time.
- Move browser-only or native-only behavior out to app-local code or
  platform-specific files — that keeps the shared surface honest about
  what it supports.
- Keep UI concerns out of hooks when the logic is reusable without
  presentation — presentation-free hooks stay testable and portable.
- Preserve behavior used by more than one app before simplifying hook
  internals — check consumers first; "unused" branches may be another
  app's path.

## Testing

- Add or update hook tests when shared behavior, branching, or contracts
  change — hook regressions surface in both apps at once.
