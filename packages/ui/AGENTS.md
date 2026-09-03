# AGENTS.md instructions for `packages/ui`

Refines the repo-root `AGENTS.md` (canonical rules) for this package.

## Responsibility

- the extension's React DOM kit: every component is the twin of one in
  `apps/mobile`, on the same `*PropsBase` contract from
  `packages/shared/src/types/ui`

## Rules

- Keep DOM-only UI here — DOM code cannot live in `packages/shared`, which
  must stay importable from React Native.
- Style from `useSemantic()` (emotion or inline styles) so the component
  follows light and dark live. No MUI, no static `semantic`/`colors` import,
  no hex, no `mode ===` — `scripts/check-dom-parity.mjs` fails CI on each.
- A component with no mobile twin is listed in that script's `DOM_ONLY` with
  its reason; otherwise it needs the twin.
- Do not put React Native code here — mobile must never depend on this
  package.
- Keep business logic in shared hooks/services unless the logic is truly
  presentational — logic buried in DOM components is unreachable from
  mobile and untestable without rendering.
- Keep shared UI contracts aligned with `packages/shared/src/types/ui` —
  the semantic contract is what keeps mobile and DOM implementations in
  sync.

## Testing

- Add or update component tests here when DOM behavior changes — the
  extension inherits every regression from this package. Render under
  `SalmonThemeProvider` when a test asserts a light-mode ink.
