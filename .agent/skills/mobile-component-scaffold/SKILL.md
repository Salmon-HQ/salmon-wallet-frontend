---
name: mobile-component-scaffold
description: "Create or modify React Native components in apps/mobile. Use this skill only when the task explicitly targets apps/mobile, React Native, Expo, native UI files, or the mobile implementation of a cross-platform contract from packages/shared/src/types/ui. This skill must decide between app-local mobile-only components and cross-platform contract + mobile implementation. Do not use it for copy-only, service-only, or generic shared UI changes unless mobile implementation work is explicitly part of the task. Use together with salmon-repo-rules whenever placement, ownership, or shared-vs-app scope is unclear."
---

# Mobile Component Scaffold

Creating a React Native component in this repo can follow two valid paths: app-local mobile UI or cross-platform contract + mobile implementation. Choose the branch before you add files.

## Workflow

1. Read `salmon-repo-rules` first if placement, ownership, or scope is unclear.
2. Search existing mobile components, shared contracts, and DOM equivalents before creating anything new.
3. Read [references/scaffold-patterns.md](references/scaffold-patterns.md).
4. Choose the branch:
   - Mobile-only branch: the component belongs only in `apps/mobile`.
   - Cross-platform branch: the same semantic contract belongs in `packages/shared/src/types/ui`.
5. Create or extend the component files for the chosen branch.
6. Update folder and app barrels.
7. Run `pnpm --filter @salmon/mobile typecheck`.

## Clarification gate

Ask 1-3 focused questions if any of these are unclear:

- Is this UI truly mobile-only, or should web/extension share the same semantic contract?
- Does a shared `PropsBase<TStyle>` contract already exist in `packages/shared/src/types/ui`?
- Is this component tied to Expo, React Native APIs, navigation, biometrics, camera, or another native capability?
- Does the behavior require `.native.tsx` / `.web.tsx` or another platform split?
- Is the component public enough to belong in `apps/mobile/src/components/index.ts`?

If the answer changes the branch, the contract location, or the public export path, ask first.

## Rules

- Use `StyleSheet.create` and tokens/helpers from `@salmon/shared`
- Keep native capability orchestration out of presentational components when possible
- Extend shared contracts locally with `ViewStyle` and RN-only props
- Use named exports in barrels
- Export public components from `apps/mobile/src/components/index.ts`
- Use platform-specific files only when behavior truly differs by platform

## Audit mode

When asked to audit mobile component structure, check for:

- Mobile components missing the usual `Component.tsx` + `types.ts` + `index.ts` structure
- Local mobile types duplicating semantic fields that should extend a shared contract
- Components with a DOM counterpart but no shared contract when the semantic API should stay aligned
- React Native components importing DOM-only types or `@salmon/ui`
- Missing barrel exports in `apps/mobile/src/components/index.ts`
- Hardcoded design values instead of tokens and helpers from `@salmon/shared`
- Components over 250-300 lines that should be split into sub-components or helpers

Report findings with file paths and concrete recommendations.

## What this skill should produce

- A mobile-only component or a cross-platform contract + mobile implementation, depending on the chosen branch
- Correct local and app-level barrel exports
- A typecheck-passing result
- An audit report when asked to review mobile component structure
- Questions first when scope, contract ownership, or platform split is ambiguous

## Test labels

Any interactive RN component must follow the `e2e-test-labels` skill: accept/forward `testID`, and set `accessibilityRole`, `accessibilityLabel` (defaulting to the visible text), and `accessibilityState` for disabled/loading so Maestro can select it by `id` without relying on copy.

## Twins and the parity gate

Every `apps/mobile/src/components` component and every `apps/mobile/app` route is one half of a pair with the extension (`AGENTS.md` §Twins). Before finishing: mobile's `types.ts` `extends` the shared `XPropsBase` (not merely imports it) and the component imports its props from `./types`; the DOM twin in `packages/ui` builds on the same base and gets the same change; any size/colour/spacing both share is a token in `packages/shared/src/theme`, not a literal. A mobile-only component or route is listed in `scripts/check-dom-parity.mjs` `MOBILE_ONLY` / `MOBILE_ONLY_SCREENS` with its reason. Run `pnpm check:parity` — it is strict in CI.
