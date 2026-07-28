@AGENTS.md

`AGENTS.md` (imported above) is the canonical rule source for this repo.
Claude-specific wiring only:

- Subagents: `.claude/agents/repo-architect.md` for package ownership and
  boundary decisions; `.claude/agents/safe-monorepo-auditor.md` for
  contract-safe cleanup, consumer checks, and verification planning.
- `.claude/skills/` mirrors the canonical skill bodies in `.agent/skills/`.
