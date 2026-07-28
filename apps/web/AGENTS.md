# AGENTS.md instructions for `apps/web`

Refines the repo-root `AGENTS.md` (canonical rules) for this app.

## Responsibility

- web app shell
- routing, providers, and browser-specific wiring

## Rules

- Keep browser-only concerns here — browser APIs leaking into shared
  packages break mobile and extension.
- Reuse `packages/shared` for logic and `packages/ui` for shared DOM
  components — local copies drift from the contract the other apps use.
- Avoid re-implementing shared services or contracts locally — duplicates
  double the fix surface when the backend or chain behavior changes.

## Testing

- Add or update web tests when web-only routing or browser-specific
  behavior changes.
- Web end-to-end tests live in `.playwright/` (Playwright + bundled
  chromium against the web dev server). See `.playwright/README.md` for
  setup and `.playwright/AGENTS.md` for conventions agents must follow
  when extending the suite.
