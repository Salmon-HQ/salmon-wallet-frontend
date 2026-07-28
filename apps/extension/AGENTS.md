# AGENTS.md instructions for `apps/extension`

Refines the repo-root `AGENTS.md` (canonical rules) for this app.

## Responsibility

- extension entrypoints (background/content/injected)
- extension pages and sheets
- browser-extension-specific integrations

## Rules

- Keep extension runtime code here — MV3/WXT constraints must not leak
  into packages the other apps consume.
- Reuse `packages/shared` for logic and `packages/ui` for shared DOM
  components when applicable — local copies drift from the shared contract.
- Keep browser-extension specifics out of shared packages unless there is
  an explicit compatibility layer — extension APIs do not exist on mobile
  or the plain web runtime.
- Verify entrypoint and page consumers before simplifying shared
  assumptions — background/content/injected contexts consume code
  differently than the popup does.

## Testing

- Add or update extension tests when extension-specific behavior or
  entrypoint contracts change.
- Browser-extension end-to-end tests live in `.playwright/` (Playwright +
  bundled chromium with the built extension loaded). See
  `.playwright/README.md` for setup and `.playwright/AGENTS.md` for
  conventions agents must follow when extending the suite.
