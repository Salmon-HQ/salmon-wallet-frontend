---
name: mobile-test-authoring
description: "Write or audit Jest tests for React Native components and mobile UI behavior in apps/mobile. Use this skill only when the task explicitly targets apps/mobile, React Native, Expo, or RN-specific behavior such as accessibility, platform splits, or native integrations. Do not use it for generic shared tests or copy-only changes unless mobile test work is explicitly requested. Use together with salmon-repo-rules when the change also affects shared contracts, ownership, or shared-vs-app boundaries."
---

# Mobile Test Authoring

`apps/mobile` uses Jest with `jest-expo` and `@testing-library/react-native`. Keep tests focused on public behavior, accessibility, callbacks, and the RN-specific risks introduced by the change.

## Workflow

1. Read `salmon-repo-rules` first if the change also touches ownership, shared contracts, or public exports.
2. Identify the changed mobile behavior and its risk: render, interaction, platform split, native integration, or accessibility.
3. Read [references/test-patterns.md](references/test-patterns.md).
4. Decide whether this is an audit-only task, a focused component test, or broader flow coverage.
5. Write or extend a co-located Jest test file.
6. Run `pnpm --filter @salmon/mobile test`.

## Clarification gate

Ask 1-3 focused questions if any of these are unclear:

- What behavior matters most: render, interaction, accessibility, or platform-specific behavior?
- Does the component depend on `useTranslation`, safe-area hooks, navigation, Expo modules, or timers that need mocking?
- Is the test meant to cover the public module export, or a specific `.native.tsx` / `.web.tsx` branch?
- Is adding or adjusting mobile test setup also in scope?

Do not guess broad test scope if the answer changes cost or tooling.

## Rules

- Use Jest and `@testing-library/react-native`, not Vitest
- Prefer user-visible text, accessibility labels, and callback assertions
- Keep mocks minimal and local to the test file
- To mock `@salmon/shared`, start from the real package and replace only what the test controls: `sharedWith({...})` from `apps/mobile/test-utils/sharedWith.ts`. A hand-listed mock of the barrel breaks whenever the component reads one more export, which is what happens each time logic is hoisted into a shared hook
- Test the public module export unless platform-specific behavior is the reason for the test
- Keep snapshots opt-in, not default
- Co-locate tests next to the component they cover

## Audit mode

When asked to audit mobile test coverage, check for:

- Mobile components with meaningful interaction and no tests
- Accessibility-sensitive components with no coverage for labels or touch targets
- Tests coupled to implementation details instead of RN-visible behavior
- Platform split components with no coverage for the risky branch
- Missing cleanup or overly broad mocks that hide real behavior

Report findings as a prioritized list: high-risk untested behavior first.

## What this skill should produce

- Jest tests aligned with the component's public behavior and RN-specific risks
- A clarified scope when test depth is initially ambiguous
- An audit report when asked to review mobile test coverage
- Questions first when mocks, platform splits, or scope are unclear
