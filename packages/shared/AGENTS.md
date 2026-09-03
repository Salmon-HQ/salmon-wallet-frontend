# AGENTS.md instructions for `packages/shared`

Refines the repo-root `AGENTS.md` (canonical rules) for this package.

## Responsibility

- shared business logic and contracts for mobile and extension
- the screen-flow layer: hooks and contexts that hold a flow's state once (Home, Send, NFT, Settings, confirmation gates, developer mode, language) and receive the account and the actions injected; platforms render
- the cross-platform component contracts in `src/types/ui` (`XPropsBase`) both twins build on
- shared API services
- shared blockchain logic
- shared hooks, types, storage, config, crypto, and theme tokens

## Rules

- Keep this package runtime-agnostic unless there is an established platform
  shim pattern — it must run on React Native, browsers, and the extension
  runtime alike.
- Do not put React DOM components here — they break the React Native bundle.
- Do not put React Native UI here — it breaks the extension bundle.
- Prefer semantic contracts and reusable logic over app-specific wiring —
  app wiring here couples all platforms to one app's shape.
- Preserve export stability: inspect all consumers before removing or
  renaming shared contracts — every export here has up to three readers
  (mobile, the extension, `packages/ui`).
- Signing, key material and storage never move into a flow hook — the hook
  receives them; see the security-sensitive areas in the root `AGENTS.md`.

## Testing

- New or changed shared behavior should come with targeted tests in this
  package when practical — a bug here ships to both apps at once. A hoisted
  flow keeps its behaviour tests here; platform tests keep rendering.
