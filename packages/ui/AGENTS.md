# AGENTS.md instructions for `packages/ui`

Refines the repo-root `AGENTS.md` (canonical rules) for this package.

## Responsibility

- shared React DOM component library for web and extension

## Rules

- Keep DOM-only UI here — DOM code cannot live in `packages/shared`, which
  must stay importable from React Native.
- Do not put React Native code here — mobile must never depend on this
  package.
- Keep business logic in shared hooks/services unless the logic is truly
  presentational — logic buried in DOM components is unreachable from
  mobile and untestable without rendering.
- Keep shared UI contracts aligned with `packages/shared/src/types/ui` —
  the semantic contract is what keeps mobile and DOM implementations in
  sync.

## Testing

- Add or update component tests here when shared DOM behavior changes —
  both web and extension inherit regressions from this package.
