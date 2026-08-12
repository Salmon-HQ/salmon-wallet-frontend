# Feature Specification: Deterministic CI checks for pull requests

**Feature Branch**: `ci/pr-checks`

**Created**: 2026-08-12

**Status**: Draft

**Input**: The repo is public and receives external PRs that are reviewed in part by AI agents. Every quality gate (`turbo run typecheck lint test`, `check:i18n`) exists and is green, but nothing runs them automatically: the only workflows are a manual extension build and a tag-triggered web deploy. CONTRIBUTING.md promises checks that no machine enforces. Everything that can be resolved deterministically must be resolved before a reviewer — human or AI — spends attention on a PR.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - External contributor gets a verdict from machines, not from review latency (Priority: P1)

An external contributor opens a PR from a fork. Within minutes, CI tells them whether typecheck, lint (zero warnings), the unit/integration suites, and i18n parity pass — without any maintainer action and without the workflow ever exposing secrets to their code.

**Why this priority**: This is the single known hole in the repo's quality system (audit 2026-08-12). Every downstream reviewer — especially AI reviewers whose context is metered — currently re-derives what a workflow could assert once, deterministically.

**Independent Test**: Open a PR from a fork with a type error; CI fails on typecheck. Push a fix; CI goes green with no maintainer involvement.

**Acceptance Scenarios**:

1. **Given** a PR from a fork, **When** CI runs, **Then** typecheck, lint, tests and `check:i18n` all execute and report pass/fail as separate visible outcomes.
2. **Given** a PR that introduces an ESLint warning, **When** CI runs, **Then** the lint step fails (`--max-warnings 0` is enforced by the package scripts).
3. **Given** a PR that adds an English string without its Spanish counterpart, **When** CI runs, **Then** the i18n step fails naming the missing key.
4. **Given** a PR from a fork, **When** any job runs, **Then** no repository secret is present in the job's context (`pull_request` event only; no `pull_request_target`).
5. **Given** a new commit pushed to an open PR, **When** the previous run is still in progress, **Then** the stale run is cancelled (concurrency group per PR).

### User Story 2 - Maintainer merges on a title that writes the changelog (Priority: P2)

The maintainer squash-merges PRs, so the PR title becomes the commit on `main`. CI validates the title against Conventional Commits before merge, replacing per-commit commitlint entirely.

**Why this priority**: 100% of recent history already follows the convention by discipline; this freezes it as config. Chosen over commitlint-on-commits deliberately (squash makes intermediate commits irrelevant — pattern used by cal.com and turborepo).

**Independent Test**: Open a PR titled "fixed stuff"; the title check fails. Retitle to "fix: ..."; it passes without a new push.

**Acceptance Scenarios**:

1. **Given** a PR whose title is not a valid Conventional Commit, **When** CI runs, **Then** the title check fails and names the allowed types.
2. **Given** a PR retitled to a valid type, **When** the title is edited, **Then** the check re-runs and passes without a new commit.

### User Story 3 - The workflows themselves are audited (Priority: P3)

Any PR that touches `.github/workflows/` is statically analyzed (zizmor) for template injection, unpinned actions, credential persistence and dangerous triggers — the CI protects itself.

**Why this priority**: A wallet repo's CI is part of its supply chain. Cheap to add, catches the class of mistake humans skim past.

**Acceptance Scenarios**:

1. **Given** a PR introducing a workflow with an unpinned action or an injectable `${{ }}` expansion into `run:`, **When** CI runs, **Then** the zizmor job reports it.

## Requirements *(mandatory)*

- **FR-001**: A `ci.yml` workflow MUST run on `pull_request` and on `push` to `main`, and MUST NOT use `pull_request_target`.
- **FR-002**: Top-level `permissions: {}`; each job grants itself only what it needs (`contents: read`; the title job `pull-requests: read`).
- **FR-003**: Every third-party action MUST be pinned to a full commit SHA with a version comment. This applies retroactively to `build-extension.yml` and `deploy-web.yml` (same versions, no behavior change).
- **FR-004**: The checks job MUST run `pnpm install --frozen-lockfile`, then `pnpm turbo run typecheck lint test`, then `node scripts/check-i18n.mjs`, with pnpm store caching via `actions/setup-node`. Node version comes from `.nvmrc`.
- **FR-005**: Total PR feedback time MUST stay under 10 minutes (measured: gates run in ~30s locally; install dominates). No Turbo remote cache in this phase (decision D5 of the audit plan).
- **FR-006**: Checkout MUST use `persist-credentials: false` (nothing in CI pushes).
- **FR-007**: PR title validation MUST accept exactly the types already used in history: feat, fix, refactor, docs, test, chore, perf, ci.
- **FR-008**: No PR size limit (decision: maintainer prefers no cap for now).
- **FR-009**: E2E suites are explicitly OUT of this workflow (separate nightly/manual workflow, later batch).

## Success Criteria *(mandatory)*

- **SC-001**: A fork PR with a deliberate type error fails CI without maintainer action.
- **SC-002**: A run on this very branch passes end to end in under 10 minutes.
- **SC-003**: zizmor reports no findings on the repo's own workflows at the `regular` persona (or each finding is explicitly acknowledged in the PR).
- **SC-004**: After this merges plus branch protection (batch `chore/oss-hardening`), the checks are markable as required.

## Out of scope

Formatting checks (batch `chore/format`), coverage thresholds (decision D7: none), Dependabot, branch protection settings themselves (not code), E2E orchestration, Turbo remote cache.
