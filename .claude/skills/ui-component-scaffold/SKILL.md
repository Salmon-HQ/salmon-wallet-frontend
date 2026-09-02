---
name: ui-component-scaffold
description: "Create or modify shared React DOM components in packages/ui. Use this skill when a task adds a new web-and-extension component, changes an existing packages/ui component, or needs the DOM implementation of a cross-platform semantic contract from packages/shared/src/types/ui. This skill must decide between two valid branches: DOM-only packages/ui components and cross-platform contract + DOM implementation. Use together with salmon-repo-rules whenever placement, ownership, or export paths are unclear."
---

The canonical instructions for this skill live in `.agent/skills/ui-component-scaffold/SKILL.md`.
Open that file and follow it. `.claude/skills/` holds only this pointer so there is a
single source of truth and no drift between tools — see the repo-root `AGENTS.md`.

## Twins and the parity gate

Every `packages/ui` component that mobile also draws is one half of a pair (`AGENTS.md` §Twins). Before finishing: the DOM `types.ts` `extends` the shared `XPropsBase` (not merely imports it); mobile's twin builds on the same base; any size/colour/spacing both share is a token in `packages/shared/src/theme`, not a literal; nothing reads static `semantic`/`colors`, MUI or hex. A DOM component with no mobile twin is listed in `scripts/check-dom-parity.mjs` `DOM_ONLY` with its reason. Run `pnpm check:parity` — it is strict in CI.
