# AGENTS.md instructions for `apps/mobile`

Refines the repo-root `AGENTS.md` (canonical rules) for this app.

## Responsibility

- React Native app implementation
- mobile-only UI flows
- native/runtime-specific integrations

## Rules

- Keep mobile-only UI and runtime behavior here — native APIs leaking into
  shared packages break web and extension.
- Reuse `packages/shared` contracts instead of duplicating business logic
  locally — duplicates drift from what web and extension ship. Prefer a
  shared semantic contract with mobile-specific rendering on top.
- Do not import DOM-only UI from `packages/ui` — it cannot run in React
  Native.

## Screen-capture protection for key material

Any component that renders or accepts secret material (mnemonic, private
key, recovery phrase) must call `useSecretScreen(label)` from
`apps/mobile/hooks/useSecretScreen.ts`. It blocks screenshots and screen
recording, and keeps the screen out of the OS app-switcher thumbnail — the
snapshot the OS takes before JS can react, which lock-on-background cannot
prevent.

The `SeedWordGrid` and `SeedWordInput` primitives already call it, so any
screen built from them inherits protection with no extra step. Build seed UI
from those primitives. Only a screen that renders key material with bespoke
markup (as `BackupPanel`, `PrivateKeyPanel`, and `app/(auth)/recover.tsx`
do) needs to call the hook itself.

Protect the whole component, not just the revealed state — the secret is in
memory and one tap away for the panel's entire lifetime. Do not extend this
to balances, addresses, or receipts: users legitimately screenshot those for
support, and blanket protection trains people to work around it.

## Testing

- Add or update mobile tests when RN behavior or mobile-only flows change.
- Mobile end-to-end UI tests live in `.maestro/` (Maestro flows against
  the iOS Simulator or Android emulator with the Expo dev build
  installed). See `.maestro/README.md` for setup and `.maestro/AGENTS.md`
  for conventions agents must follow when extending the suite.

## Production builds (.aab / .ipa)

Agent guardrails:

- Do not launch production builds autonomously — point the human at
  `pnpm build:aab` / `pnpm build:apk` and walk them through the checklist
  below. Builds are interactive, long-running, and touch EAS managed
  credentials.
- Never regenerate, overwrite, or "fix" the Android keystore through
  `eas credentials` autonomously — losing a published keystore permanently
  removes the ability to update the Play Store listing. Ask the human first.

## OTA updates cannot carry native modules

`runtimeVersion.policy` is `appVersion`, so an OTA reaches every installed
binary sharing that version string. A JS bundle that imports a native module
the installed binary does not contain **hard-crashes the app at launch**, for
every user on that version, with no way back in — the update ships, the app
dies, and the user cannot receive the fix that follows.

`expo-screen-capture` is the live example: `useSecretScreen` is reached from
`_layout.tsx` through a barrel, so publishing it as an update to binaries
built before it was added bricks them.

Before publishing any OTA, check whether the diff adds or newly reaches a
native module. If it does, it is a **binary release with a bumped version**,
not an update. Adding a silent fallback to make such a module optional is
usually the wrong answer where the module enforces a security property: a
no-op ships the protection turned off, which is worse than a crash in
testing.

Pre-build checklist — run in order before `eas build --profile production`:

1. **Tests green**: from repo root run
   `pnpm turbo run typecheck lint test --filter=@salmon/mobile --filter=@salmon/shared --filter=@salmon/ui`.
   Lint warnings do not block the build, but clean them before tagging a release so noise does not accumulate.
2. **Env vars sane**: confirm `apps/mobile/.env.{mode}` points to the URLs of the intended target
   (no staging pointing to prod or vice versa). See `.env.example` for the layering rules.
3. **Versioning**: bump `app.json → expo.version` manually (semver, user-facing) when the release warrants it.
   `versionCode` is bumped automatically by EAS via `appVersionSource: "remote"` + `autoIncrement: true`
   on the production profile, so the build needs internet access to reserve the next code.
4. **Android keystore**: managed by EAS. Inspect with `eas credentials` from `apps/mobile/`.
   **Never regenerate a keystore that is already published to Play Store** — losing it
   means losing the ability to update that listing forever. Keep an out-of-repo backup
   plus a remote backup (password manager, encrypted drive, etc.).
5. **Resources**: 8+ GB free disk, 8+ GB free RAM. Close heavy apps (IDE, browser, Docker) before a local build.
6. **Build command** (from `apps/mobile/`):
   - `.aab` for Play Store: `pnpm build:aab`
   - `.apk` for sideload: `pnpm build:apk`

   Both scripts wrap `eas build ... --local --output` and name the binary
   `salmon-wallet-<version>-<YYYY-MM-DD>.{aab,apk}` automatically, where
   `<version>` is read from `app.json` → `expo.version`. The `versionCode`
   is assigned by EAS during the build and is not included in the filename;
   read it from the build output or `keytool -printcert -jarfile <file>`
   when you need it.

Post-build:

- Verify the binary's signing fingerprint matches the keystore on record:
  `keytool -printcert -jarfile <file.aab>` (or `apksigner verify --print-certs <file.apk>`).
- Run `git status` after the build — discard any autogenerated changes inside
  `apps/mobile/android/` unless they are intentional.
- Distribution: `.aab` targets the Play Store; `.apk` is for sideload testing.

Source of truth for env vars:

- This repo is opensource and ships non-secret env values committed in `apps/mobile/.env.{mode}`.
- When real secrets appear (Sentry auth token, analytics write keys, etc.) they belong in
  EAS Environment with `secret` visibility, never in a committed `.env`.
- Do not duplicate the same variable across `eas.json` `env` block and `.env.{mode}` —
  pick one source per variable to avoid silent drift.

### Build warnings that are safe to ignore

These appear during `pnpm build:aab` / `pnpm build:apk` and do not block the build:

- `The android project is malformed, project files will be cleared and reinitialized` —
  EAS regenerates the native folder in its own temp dir; the committed `apps/mobile/android/`
  is untouched.
- `ANDROID_NDK_HOME environment variable was not specified` — only matters if the project
  ships custom C++ native modules; this app does not.
- `Node.js version in your eas.json does not match` — patch-level differences are fine;
  EAS Local uses the system Node binary.
- `NODE_ENV=production ... will make yarn/npm install only production packages` —
  informational; build-time tooling for Expo lives in `dependencies`, not `devDependencies`.
- `punycode DeprecationWarning` — Node 22 deprecation surfacing from inside `eas-cli`.
- `eas-cli@<x> is now available` — cosmetic.

If the build fails with `module not found` after the `NODE_ENV=production` warning, a
build-time package is misplaced under `devDependencies` — move it to `dependencies` and
rebuild.

### Testing a built `.aab` locally

For a smoke check of a built bundle on a connected device (no Play Console
needed), use `bundletool`:
`bundletool build-apks --bundle=<file.aab> --output=<file.apks> --connected-device`
then `bundletool install-apks --apks=<file.apks>`. Useful for a quick sanity
install but does not exercise Play Store resigning, install flow, or rollout
gating.

### Release logistics

Store credentials, keystore backups, Play Console access, submission
automation, and distribution channels are handled internally by the
maintainers and are intentionally not documented in this repo.
