---
name: salmon-monorepo-safe-change
description: Safely modify or clean salmon-wallet-v3 without breaking active shared contracts. Use this skill for shared hook changes, API-service changes, frontend cleanup, platform-boundary audits, or consumer-sensitive refactors that require verification across apps and backend contracts.
---

Thin pointer — the canonical rules live elsewhere; do not duplicate them here.

1. Apply the **Changing or removing existing code**, **Security-sensitive
   areas**, and **Verification** sections of the repo-root `AGENTS.md`
   (consumer checks, export stability, `../salmon-api` cross-check, targeted
   tests before/after).
2. For placement or ownership questions raised by the change, follow
   `.agent/skills/salmon-repo-rules/SKILL.md`.

Output expected: a conservative implementation plan, explicit verification
steps, and a final summary of changed contracts, tests run, and residual
risk.
