# AGENTS.md instructions for `packages/shared`

Refines the repo-root `AGENTS.md` (canonical rules) for this package.

## Responsibility

- shared business logic and contracts for mobile, web, and extension
- shared API services
- shared blockchain logic
- shared hooks, types, storage, config, crypto, and theme tokens

## Rules

- Keep this package runtime-agnostic unless there is an established platform
  shim pattern — it must run on React Native, browsers, and the extension
  runtime alike.
- Do not put React DOM components here — they break the React Native bundle.
- Do not put React Native UI here — it breaks web and extension bundles.
- Prefer semantic contracts and reusable logic over app-specific wiring —
  app wiring here couples all platforms to one app's shape.
- Preserve export stability: inspect all app consumers before removing or
  renaming shared contracts — every export here has up to three consumers.

## Testing

- New or changed shared behavior should come with targeted tests in this
  package when practical — a bug here ships to all three apps at once.
