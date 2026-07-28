---
name: salmon-repo-rules
description: "Resolve code placement, package ownership, shared-vs-app boundaries, public exports, and architectural conventions in the Salmon Wallet monorepo. Use this skill whenever a task could change where code lives, which package owns it, whether a contract belongs in packages/shared, whether UI belongs in packages/ui or apps/mobile, or how barrels and theme tokens should be handled. Use it together with the authoring and testing skills whenever structure or ownership could change."
---

Detailed placement and ownership workflow for the Salmon Wallet monorepo. The canonical high-level rules live in the repo-root `AGENTS.md` (Ownership model, Placement rules, Changing or removing existing code); this skill carries the decision matrices, clarification gates, and audit checklists that file intentionally does not duplicate. Load the relevant reference, inspect existing code, then act.

## Mandatory stance

- Prefer existing repo patterns over inventing new ones.
- Search before creating new files, hooks, types, or components.
- Ask clarifying questions when architecture, ownership, or behavior is ambiguous.
- Use this skill alongside specialized authoring or testing skills whenever structure or public exports may change.

## Clarification gate

Before making a change, stop and ask 1-3 focused questions if any of these are unclear:

- Is this code truly shared across `mobile`, `web`, and `extension`?
- Does it belong in `packages/ui` or in an app-specific directory?
- Is the type semantic and cross-platform, or only visual/platform-specific?
- Does a dependency (browser API, React Native API, biometrics, navigation) make it platform-only?
- Does the change alter a public export path, barrel, or contract?
- Is the code in the middle of an in-flight refactor?
- Does mobile also need this component or flow?
- Is part of the logic a service, util, or mapper rather than hook/component logic?
- Does something equivalent already exist in the repo?

If the answer could change code placement, API shape, or test scope, ask first.

## Core rules

Canonical ownership and placement rules (with rationale): repo-root `AGENTS.md`. Skill-level additions not covered there:

- External consumers prefer `@salmon/shared`. Inside `packages/shared`, use relative imports — self-imports through the package name confuse bundlers.
- Hooks over 300 lines and components over 250-300 lines are split candidates — past that size, mixed concerns hide bugs.

The full rule set with placement shortcuts lives in [references/core-rules.md](references/core-rules.md).

## Route to the right reference

Pick the reference that matches the task:

| Task | Reference |
|---|---|
| Deciding where code lives | [references/placement-matrix.md](references/placement-matrix.md) |
| Creating or editing shared hooks | [references/hook-rules.md](references/hook-rules.md) |
| Creating or editing shared DOM components | [references/component-rules.md](references/component-rules.md) |
| Creating or editing React Native components in `apps/mobile` | [references/mobile-rules.md](references/mobile-rules.md) |
| Creating or editing cross-platform UI contracts | [references/contract-rules.md](references/contract-rules.md) |

Read the relevant reference before making changes. Check `openspec/config.yaml` and relevant specs when the work touches architecture or established capabilities.

## Companion skills

- Use `ui-component-scaffold` for `packages/ui` implementation work.
- Use `ui-test-authoring` for `packages/ui` test work.
- Use `mobile-component-scaffold` for `apps/mobile` component work.
- Use `mobile-test-authoring` for `apps/mobile` test work.
- Use `shared-test-authoring` for `@salmon/shared` tests.
- Use `api-service-authoring` for shared API services.

## Audit mode

When asked to audit the repo structure, check for:

- Code in `packages/shared` that is only used by one platform (should be app-local)
- Code in `packages/ui` that contains business logic (should be in shared or app)
- Hooks in `packages/shared` that depend on browser or React Native APIs (platform leak)
- Default exports in public barrels (should be named exports only)
- Domain types duplicated across multiple locations instead of having one canonical home
- Components over 250-300 lines or hooks over 300 lines that haven't been split
- Barrel exports that are out of sync with actual module exports
- Hardcoded design values (colors, spacing, font sizes) instead of theme tokens
- Import paths using `@salmon/ui` from mobile (not allowed)
- Types in `packages/shared/src/types/ui/` that only reference DOM-specific concerns
- React Native components that duplicate shared semantic contracts instead of extending them
- Mobile-only components incorrectly pushed into `packages/shared` or `packages/ui`

Report findings as a prioritized list with file paths and specific violations.

## What this skill should produce

- A concrete statement of which rules apply to the task.
- A clear placement recommendation with reasoning.
- An audit report when asked to review repo structure or conventions.
- Clarifying questions first when ownership is ambiguous.
