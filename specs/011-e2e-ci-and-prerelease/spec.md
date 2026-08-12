# Feature Specification: E2E automation off the PR critical path + pre-release circuit

**Feature Branch**: `ci/e2e`

**Created**: 2026-08-12

**Status**: Draft

**Input**: Three E2E suites exist (web Playwright, extension Playwright, mobile Maestro) but nothing runs them automatically, and the extension suite could only run headed. Per the approved plan: E2E must NOT run on every PR (slow, flakier per bug caught than unit layers); they run nightly, on demand, and via the `e2e` label — plus a documented pre-release circuit that includes what CI cannot run (Maestro on a simulator, backend-dependent flows). Decision D3: no backend in CI — backend-dependent specs already skip when it is unreachable; decision D4: Maestro stays a local pre-release gate.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Regressions in user flows surface within a day, not at release time (Priority: P1)

The web and extension Playwright suites run every night on `main` and post a visible pass/fail without anyone asking.

**Acceptance Scenarios**:

1. **Given** the nightly schedule, **When** it fires, **Then** both Playwright suites run headless on ubuntu against a fresh build, without secrets beyond the gitignored-equivalent test env the workflow itself provides.
2. **Given** a backend-dependent spec, **When** no backend is reachable in CI, **Then** it skips (existing suite contract) rather than fails.

### User Story 2 - A risky PR can opt into E2E (Priority: P2)

A maintainer adds the `e2e` label (created in the oss-hardening batch) to a PR that touches flow-critical code; the same jobs run on that PR's code.

**Acceptance Scenarios**:

1. **Given** a PR labeled `e2e`, **When** the label is added or a new commit is pushed with the label present, **Then** the suites run on the PR head.
2. **Given** an unlabeled PR, **Then** this workflow does not run at all (PR feedback time stays owned by ci.yml).

### User Story 3 - The extension suite runs on a machine with no display (Priority: P1)

**Acceptance Scenarios**:

1. **Given** `SALMON_E2E_HEADLESS=1`, **When** the extension suite runs, **Then** the MV3 extension loads in Playwright's bundled `chromium` channel headless and the full suite passes — validated locally before this merges.
2. **Given** a local run without the flag, **Then** behavior is unchanged (headed, same profiles).

### User Story 4 - A release has a written, complete gate (Priority: P1)

`docs/QA-RUNBOOK.md` documents the full pre-release circuit: what CI already covered, what must run locally (Maestro smoke + authorized actions, backend-live integration tests, on-chain-gated specs), in what order, and what constitutes a "go".

**Acceptance Scenarios**:

1. **Given** the runbook, **When** a maintainer follows it before tagging a release, **Then** every command is copy-pasteable and states its expected outcome and its skip conditions (e.g. Maestro needs a booted simulator; on-chain specs spend real SOL and are opt-in).

## Requirements *(mandatory)*

- **FR-001**: New workflow `.github/workflows/e2e.yml`; triggers: `schedule` (nightly), `workflow_dispatch`, and `pull_request` types `[labeled, synchronize, opened, reopened]` gated on the `e2e` label. Never on plain PRs.
- **FR-002**: Same security posture as ci.yml: `permissions: {}` top-level, per-job minimal grants, SHA-pinned actions, `persist-credentials: false`, no `pull_request_target`, no secrets in fork context.
- **FR-003**: Suites need a test env: CI writes a minimal `.env.test` from the committed `.env.test.example` values (public test data only — the suites' own READMEs define which keys are safe defaults). Anything requiring a real secret must skip, not fail.
- **FR-004**: Web job uses the suite's own webServer mechanism; extension job builds `dist/chrome-mv3` first. Playwright browsers installed via `pnpm exec playwright install chromium --with-deps` (only chromium in CI; the web suite's firefox/webkit projects are filtered to chromium in CI runs).
- **FR-005**: The only production-adjacent change allowed is the fixture headless switch (channel + env flag) and, if needed, config-level project filtering — no spec logic changes in this batch. Known `waitForTimeout` flakiness stays as-is (documented; a later cleanup).
- **FR-006**: Timeout caps per job; artifacts (playwright-report) uploaded on failure for debugging.

## Success Criteria *(mandatory)*

- **SC-001**: Extension suite passes headless locally with `SALMON_E2E_HEADLESS=1` (full run, not a sample).
- **SC-002**: Web suite passes locally (chromium project at minimum).
- **SC-003**: zizmor reports no findings on the new workflow.
- **SC-004**: QA-RUNBOOK contains the complete pre-release circuit including Maestro and the backend-live layer.
- **SC-005**: Full repo gates green.

## Out of scope

Maestro in CI (decision D4 — local gate; revisit later), backend containers in CI (D3), fixing existing `waitForTimeout`s, storageState for authenticated web flows (documented gap in the web suite's AGENTS.md, separate work).
