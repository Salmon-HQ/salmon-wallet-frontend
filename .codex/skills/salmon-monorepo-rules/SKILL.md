---
name: salmon-monorepo-rules
description: Resolve package ownership, shared-vs-app boundaries, and placement decisions in salmon-wallet-v3. Use this skill whenever a task could change where code lives across `packages/shared`, `packages/ui`, `apps/mobile`, `apps/web`, or `apps/extension`.
---

Thin pointer — the canonical rules live elsewhere; do not duplicate them here.

1. Apply the **Ownership model**, **Placement rules**, and **When in doubt,
   ask the human** sections of the repo-root `AGENTS.md`.
2. For detailed decision matrices (by platform scope, by artifact type,
   anti-patterns) and audit checklists, follow
   `.agent/skills/salmon-repo-rules/SKILL.md` and its `references/`.

Output expected: a concrete placement recommendation with a short rationale
tied to the ownership model, or clarifying questions first when ownership is
ambiguous.
