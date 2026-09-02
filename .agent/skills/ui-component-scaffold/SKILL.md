---
name: ui-component-scaffold
description: "Create or modify shared React DOM components in packages/ui. Use this skill when a task adds a new web-and-extension component, changes an existing packages/ui component, or needs the DOM implementation of a cross-platform semantic contract from packages/shared/src/types/ui. This skill must decide between two valid branches: DOM-only packages/ui components and cross-platform contract + DOM implementation. Use together with salmon-repo-rules whenever placement, ownership, or export paths are unclear."
---

Creating a shared DOM component in this monorepo can follow two different workflows. Pick the right branch first so you do not create the wrong shared contract.

## Workflow

1. Read `salmon-repo-rules` first if placement, ownership, or shared-vs-app scope is unclear.
2. Search existing components, contracts, and app-local equivalents before creating anything new.
3. Read [references/scaffold-patterns.md](references/scaffold-patterns.md).
4. Choose the branch:
   - DOM-only branch: the component is shared by `web` and `extension`, but no shared semantic contract is needed outside `packages/ui`.
   - Cross-platform branch: mobile also needs the component, or the semantic contract should live in `packages/shared/src/types/ui`.
5. Create or extend the component files for the chosen branch.
6. Update folder and package barrels.
7. Run `pnpm turbo run typecheck --filter=@salmon/shared --filter=@salmon/ui`.

## Clarification gate

Ask 1-3 focused questions if any of these are unclear:

- Is this component shared by both web and extension, or only one?
- Does mobile need a parallel implementation? If so, a `PropsBase<TStyle>` contract in shared is essential.
- Does a similar component or contract already exist in the repo?
- Is part of this logic actually business logic that belongs in a shared hook or util, not in the component?
- Is the component complex enough to need sub-components from the start?
- Is this actually DOM-only, with no reason to create a shared semantic contract?

If the answer changes where the type contract lives or whether the component belongs in `packages/ui`, ask first.

## Audit mode

When asked to audit UI component structure, check for:

- Components missing the three-file structure (`Component.tsx` + `types.ts` + `index.ts`)
- Components in `packages/ui` with no corresponding `PropsBase` type in `packages/shared/src/types/ui/` (when mobile also has the component)
- Local `types.ts` files that duplicate semantic fields instead of extending from `@salmon/shared`
- Components not exported from the main barrel (`packages/ui/src/components/index.ts`)
- Hardcoded design values instead of tokens from `@salmon/shared`
- Components over 250-300 lines that should be split into sub-components
- Default exports instead of named exports
- DOM-only components that were forced into `packages/shared/src/types/ui` without a real cross-platform need

Report findings with file paths and specific recommendations for each violation.

## What this skill should produce

- A DOM-only `packages/ui` component or a cross-platform contract + DOM implementation, depending on the chosen branch.
- Correct barrel exports for the chosen branch.
- A typecheck-passing result.
- An audit report when asked to review component structure or conventions.
- Questions first when scope or ownership is ambiguous.

## Test labels

Any interactive DOM component must follow the `e2e-test-labels` skill: thread a `testID?` prop (forwarded to `data-testid`), keep the correct implicit role, and add `aria-label` on icon-only controls so Playwright/Maestro can select it without CSS or text matching.

## Twins and the parity gate

Every `packages/ui` component that mobile also draws is one half of a pair (`AGENTS.md` §Twins). Before finishing: the DOM `types.ts` `extends` the shared `XPropsBase` (not merely imports it); mobile's twin builds on the same base; any size/colour/spacing both share is a token in `packages/shared/src/theme`, not a literal; nothing reads static `semantic`/`colors`, MUI or hex. A DOM component with no mobile twin is listed in `scripts/check-dom-parity.mjs` `DOM_ONLY` with its reason. Run `pnpm check:parity` — it is strict in CI.
