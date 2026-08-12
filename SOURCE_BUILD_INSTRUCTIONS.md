# Build Instructions — Salmon Wallet Browser Extension

These instructions reproduce the **published extension** byte-for-byte from this
source package, in a clean environment.

> **For maintainers — what to submit to AMO.** This is a pnpm-workspace
> monorepo: the extension cannot build without the repository root,
> `pnpm-lock.yaml`, and the `packages/shared` + `packages/ui` workspaces. Submit
> the **full-repository** source archive, generated from a clean commit with:
>
> ```bash
> pnpm pack:sources   # → salmon-wallet-source.zip (git-tracked files only)
> ```
>
> Do **not** submit the per-package `dist/*-sources.zip` produced by `wxt zip`:
> it contains only `apps/extension/` and is not buildable on its own.

## 1. Prerequisites

| Tool    | Exact version                 | Notes                                                                               |
| ------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| Node.js | **22.12.0** (any 22.12.x LTS) | Pinned in `.nvmrc`. Node 20.19+ also works; **Node 24 is not supported.**           |
| pnpm    | **9.x**                       | The only supported package manager. Provided via Corepack — do not use npm or yarn. |
| OS      | Linux / macOS                 | A POSIX shell.                                                                      |

> **Why pnpm only:** this is a pnpm-workspace monorepo. The extension depends on
> `packages/shared` and `packages/ui` through the `workspace:*` protocol, which
> npm and yarn cannot resolve. A `preinstall` guard (`scripts/check-build-env.cjs`)
> will stop the install with a clear message if the wrong package manager or Node
> version is used.

### Set up the toolchain

```bash
# Use the pinned Node version (reads .nvmrc → 22.12.0)
nvm install
nvm use

# Enable Corepack so the repo-pinned pnpm@9 is used automatically
corepack enable
```

## 2. Install dependencies

From the repository root:

```bash
pnpm install --frozen-lockfile
```

`--frozen-lockfile` guarantees the exact dependency tree recorded in
`pnpm-lock.yaml` (committed) is installed — no version drift.

## 3. Build

The production build inputs live in `apps/extension/.env.production` (committed,
contains **no secrets**). No other env file is required.

> **Do not create an `apps/extension/.env` file.** A local, unsuffixed `.env`
> would be layered under `.env.production` and could change the output. A clean
> checkout of this source package does not contain one.

### Firefox (Manifest V2) — the published AMO build

```bash
pnpm --filter @salmon/extension build:firefox:prod
```

Output: `apps/extension/dist/firefox-mv2/`

To produce the distributable archive:

```bash
pnpm --filter @salmon/extension zip:firefox
```

Output: `apps/extension/dist/<name>-<version>-firefox.zip`

### Chrome (Manifest V3)

```bash
pnpm --filter @salmon/extension build:prod   # → apps/extension/dist/chrome-mv3/
pnpm --filter @salmon/extension zip          # → apps/extension/dist/<name>-<version>-chrome.zip
```

## 4. Verify the build reproduces

Compare the contents of `apps/extension/dist/firefox-mv2/` against the unpacked
published add-on. The `manifest.json` and the JavaScript/CSS bundles should be
identical. A quick aggregate check:

```bash
cd apps/extension/dist/firefox-mv2
find . -type f -exec sha256sum {} \; | sort
```

The build is deterministic: repeating steps 2–3 in the same environment yields
byte-identical output.

## 5. Determinism guarantees

This source package is reproducible because:

- **`pnpm-lock.yaml` is committed** — the dependency tree is pinned.
- **Node and pnpm versions are pinned** (`.nvmrc`, `packageManager` field) and
  enforced by the `preinstall` guard.
- **All build-time env values are committed** in `apps/extension/.env.production`
  and contain no secrets. The build never reads values from the builder's
  machine. (API endpoints are also hardcoded per environment in
  `packages/shared/src/api/config.ts`.)
- The bundler exposes only an **explicit allowlist** of env values to the
  runtime; it never inlines the full environment, so a stray local secret cannot
  end up in the bundle.

## Project structure

Monorepo managed with pnpm workspaces. The extension at `apps/extension`
depends on two internal packages:

- `packages/shared` — shared business logic
- `packages/ui` — shared UI components

Both are resolved automatically via the `workspace:*` protocol.
