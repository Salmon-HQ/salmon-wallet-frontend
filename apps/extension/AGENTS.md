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
  an explicit compatibility layer — extension APIs do not exist on mobile.
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

## Releasing

- Bump `package.json → version`, add the `## extension X.Y.Z — <date>`
  section to the root `CHANGELOG.md` (it becomes the GitHub Release notes),
  merge, then push the tag `extension/vX.Y.Z` on the merged commit. The
  workflow refuses a tag that does not match `package.json` or whose commit
  has no green CI run.
- A new entry in `permissions` / `host_permissions` (also: a new API or CDN
  host in `.env.production`) is a change users see — Chrome disables the
  extension until they accept it. CI compares the built manifest with
  `manifest-permissions.json`; refresh it on purpose, and say why in the PR:
  `pnpm --filter @salmon/extension build && pnpm check:manifest --write`.
- Firefox is linted with `web-ext` (pinned by version in
  `.github/workflows/build-extension.yml`; bump by hand) and rebuilt twice to
  prove determinism, because AMO rebuilds from `salmon-wallet-source.zip`.
