---
name: mobile-component-scaffold
description: "Create or modify React Native components in apps/mobile. Use this skill only when the task explicitly targets apps/mobile, React Native, Expo, native UI files, or the mobile implementation of a cross-platform contract from packages/shared/src/types/ui. This skill must decide between app-local mobile-only components and cross-platform contract + mobile implementation. Do not use it for copy-only, service-only, or generic shared UI changes unless mobile implementation work is explicitly part of the task. Use together with salmon-repo-rules whenever placement, ownership, or shared-vs-app scope is unclear."
---

The canonical instructions for this skill live in `.agent/skills/mobile-component-scaffold/SKILL.md`.
Open that file and follow it. `.claude/skills/` holds only this pointer so there is a
single source of truth and no drift between tools — see the repo-root `AGENTS.md`.

## Twins and the parity gate

Every `apps/mobile/src/components` component and every `apps/mobile/app` route is one half of a pair with the extension (`AGENTS.md` §Twins). Before finishing: mobile's `types.ts` `extends` the shared `XPropsBase` (not merely imports it) and the component imports its props from `./types`; the DOM twin in `packages/ui` builds on the same base and gets the same change; any size/colour/spacing both share is a token in `packages/shared/src/theme`, not a literal. A mobile-only component or route is listed in `scripts/check-dom-parity.mjs` `MOBILE_ONLY` / `MOBILE_ONLY_SCREENS` with its reason. Run `pnpm check:parity` — it is strict in CI.
